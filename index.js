require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { login, getSessionId, submit, sample, retriveRequests } = require('./utils');
const rateLimit = require('express-rate-limit');
const { promisify } = require('util');
const Queue = require('bull');

// Environment variables with constants
const USE_QUEUE = process.env.USE_QUEUE === 'true';
const SSL_ENABLED = process.env.SSL_ENABLED === 'true';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
const WAIT_TIME_SECONDS = +process.env.WAIT_TIME_SECONDS;
const WAIT_SAFETY_MARGIN = 1000;
const MAX_GENERATION_TIMEOUT = 40 * 1000;
const POLL_INTERVAL = 2000; // the time between retrive requests that check the status of the generation
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let redisRetryMax = 5;
let serviceConfig = {
  user_id: null,
  user_handle: null,
  org_id: null,
  session_id: null,
};

console.log('WAIT_TIME_SECONDS', +process.env.WAIT_TIME_SECONDS);

const imageQueue = USE_QUEUE
  ? new Queue('img-generations', REDIS_URL, {
      limiter: { max: 1, duration: WAIT_TIME_SECONDS * 1000 + WAIT_SAFETY_MARGIN },
      redis: {
        retryStrategy: (times) => {
          if (times < redisRetryMax) {
            console.log(`Retrying connection to Redis (Retry #${times}/${redisRetryMax})`);
            return Math.min(times * 500, 2000);
          }
          throw new Error(`Unable to connect to Redis after ${times} tries`);
        },
      },
    })
  : null;

/// rate limiting optional
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

const app = express();
app.use(cors({ origin: process.env.ORIGIN || '*' }));
app.use(express.json());
app.use(limiter);

// Helper function to poll for completion
async function pollForCompletion(request_id, org_id) {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_GENERATION_TIMEOUT) {
    const response = await retriveRequests(request_id, org_id);
    console.log('request with id >>', request_id, 'is', response.sampling_requests[0].completion_percentage + '%');
    if (response.sampling_requests?.[0].is_completed) {
      console.log(request_id, 'completed');
      return response.sampling_requests[0].responses.map(
        (response) => `https://ideogram.ai/assets/image/lossless/response/${response.response_id}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error('Request timeout');
}

// Direct processing without queue
async function processImageDirect(prompt, serviceConfig) {
  const { user_handle, user_id, org_id, session_id } = serviceConfig;

  const submitData = await submit(user_handle, user_id, org_id, session_id, process.env.LOCATION);
  if (!submitData?.success) {
    throw new Error('Failed to submit image generation request');
  }
  let sampleData = await sample(prompt, user_id, org_id);
  if (!sampleData?.request_id) {
    let message = sampleData?.message;
    if (message.includes('You have reached your weekly limit')) {
      throw new Error('You have reached your weekly limit');
    } else {
      throw new Error('Failed to generate image');
    }
  }
  console.log(sampleData.request_id);
  return await pollForCompletion(sampleData.request_id, org_id);
}

// Queue processor (only if queue is enabled)
if (USE_QUEUE) {
  imageQueue.process(async (job) => {
    const { prompt } = job.data;
    return await processImageDirect(prompt, serviceConfig);
  });
}

app.post('/create-image', async (req, res) => {
  try {
    if (!serviceConfig.user_id || !serviceConfig.user_handle || !serviceConfig.org_id) {
      throw new Error('Service not initialized');
    }

    const { prompt } = req.body;

    console.log('prompt', prompt);

    let result;
    if (USE_QUEUE) {
      // Queue-based processing
      const job = await imageQueue.add(
        { prompt },
        {
          attempts: 1,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        }
      );
      result = await job.finished();
    } else {
      // Direct processing
      result = await processImageDirect(prompt, serviceConfig);
    }

    res.json({ images: result });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      error: error.message,
      requestId: error?.requestId,
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    serviceInitialized: Boolean(serviceConfig.user_id && serviceConfig.user_handle),
    queueEnabled: USE_QUEUE,
    sslEnabled: SSL_ENABLED,
  });
});

// Graceful shutdown handling
async function shutdown() {
  console.log('Shutting down gracefully...');
  if (USE_QUEUE) {
    await imageQueue.close();
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function start() {
  try {
    const data = await login();
    serviceConfig = {
      session_id: getSessionId(),
      user_id: data?.user_model?.user_id,
      user_handle: data?.user_model?.display_handle,
      org_id: data?.user_model?.organization_id,
    };

    const port = process.env.PORT || 3000;
    let server;

    if (SSL_ENABLED) {
      if (!SSL_KEY_PATH || !SSL_CERT_PATH) {
        throw new Error('SSL enabled but certificate paths not provided');
      }

      try {
        const [key, cert] = await Promise.all([
          fs.promises.readFile(SSL_KEY_PATH),
          fs.promises.readFile(SSL_CERT_PATH),
        ]);

        const sslOptions = { key, cert };
        server = https.createServer(sslOptions, app);
        console.log('SSL enabled');
      } catch (error) {
        console.error('Failed to read SSL certificates:', error);
        throw error;
      }
    } else {
      server = http.createServer(app);
    }

    // Promisify and use server.listen within the async function
    const listenAsync = promisify(server.listen.bind(server));
    await listenAsync(port);
    console.log('Service Config:', serviceConfig);
    console.log(`Service running on port ${port} (${SSL_ENABLED ? 'HTTPS' : 'HTTP'})`);
    console.log(`Queue processing is ${USE_QUEUE ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('Failed to initialize service:', error);
    process.exit(1);
  }
}

start();
