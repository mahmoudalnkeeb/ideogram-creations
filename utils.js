const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const authorization = fs.readFileSync(path.join(__dirname, 'authorization.txt'), 'utf8');
const cookie = fs.readFileSync(path.join(__dirname, 'cookie.txt'), 'utf8');

function getRequestId() {
  return uuid.v4().replace(/-/g, '');
}

function getSessionId() {
  let timestamp = Date.now();
  return `${uuid.v4()}_${timestamp}`;
}

async function handleResponse(response) {
  const contentType = response.headers.get('Content-Type');
  if (response.ok) {
    if (contentType.includes('application/json')) {
      return await response.json();
    } else if (contentType.includes('text/html')) {
      const html = await response.text();
      throw new Error(`Unexpected HTML response: ${html.substring(0, 100)}...`);
    } else {
      throw new Error('Unexpected response type.');
    }
  } else {
    const errorText = await response.text();
    throw new Error(`HTTP Error ${response.status}: ${errorText}`);
  }
}

async function login() {
  try {
    const data = await fetch('https://ideogram.ai/api/account/login', {
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.6',
        authorization,
        'content-type': 'application/json',
        priority: 'u=1, i',
        'sec-ch-ua': '"Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1',
        traceparent: '00-fd16618b86ea493d9606d0c8536291fd-fd16618b86ea493d-00',
        'x-request-id': getRequestId(),
        cookie,
        Referer: 'https://ideogram.ai/t/my-images',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      body: JSON.stringify({ external_photo_url: process.env.EXTERNAL_PHOTO_URL }),
      method: 'POST',
    });

    return await handleResponse(data);
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
}

async function submit(user_handle, user_id, org_id, session_id, location) {
  try {
    const data = await fetch('https://ideogram.ai/api/e/submit', {
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.6',
        authorization,
        'content-type': 'application/json',
        priority: 'u=1, i',
        'sec-ch-ua': '"Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1',
        traceparent: '00-fd16618b86ea493d9606d0c8536291fd-fd16618b86ea493d-00',
        'x-ideo-org': org_id,
        'x-request-id': getRequestId(),
        cookie,
        Referer: 'https://ideogram.ai/t/my-images',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      body: JSON.stringify({
        event_key: 'V2_GENERATION',
        metadata: JSON.stringify({
          path: '/t/my-images',
          triggeredUtcTime: Date.now(),
          userAgent:
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          isMobileLayout: false,
          userHandle: user_handle,
          userId: user_id,
          sessionId: session_id,
          location,
          generationInProgress: false,
        }),
      }),
      method: 'POST',
    });

    return await handleResponse(data);
  } catch (error) {
    console.error('Error submitting image generation request:', error);
    throw error;
  }
}

async function sample(prompt, user_id, org_id) {
  try {
    const data = await fetch('https://ideogram.ai/api/images/sample', {
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.6',
        authorization,
        'content-type': 'application/json',
        priority: 'u=1, i',
        'sec-ch-ua': '"Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1',
        traceparent: '00-fd16618b86ea493d9606d0c8536291fd-fd16618b86ea493d-00',
        'x-ideo-org': org_id,
        'x-request-id': getRequestId(),
        cookie,
        Referer: 'https://ideogram.ai/t/my-images',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      body: JSON.stringify({
        prompt,
        user_id,
        model_version: 'V_1_5',
        use_autoprompt_option: 'ON',
        sampling_speed: 0,
        style_expert: 'AUTO',
        resolution: { width: 1024, height: 1024 },
        color_palette: [
          { color_hex: '#F24B59' },
          { color_hex: '#49D906' },
          { color_hex: '#AED919' },
          { color_hex: '#F2B29B' },
          { color_hex: '#BF1E10' },
        ],
      }),
      method: 'POST',
    });

    return await handleResponse(data);
  } catch (error) {
    console.error('Error submitting image generation request:', error);
    throw error;
  }
}

async function retriveRequests(request_id, org_id) {
  try {
    const data = await fetch('https://ideogram.ai/api/gallery/retrieve-requests', {
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.6',
        authorization,
        'content-type': 'application/json',
        priority: 'u=1, i',
        'sec-ch-ua': '"Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1',
        traceparent: '00-fd16618b86ea493d9606d0c8536291fd-fd16618b86ea493d-00',
        'x-ideo-org': org_id,
        'x-request-id': getRequestId(),
        cookie,
        Referer: 'https://ideogram.ai/t/my-images',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      body: JSON.stringify({ request_ids: [request_id] }),
      method: 'POST',
    });

    return await handleResponse(data);
  } catch (error) {
    console.error('Error fetching requests:', error);
    throw error;
  }
}

async function userGallary(userId, org_id) {
  try {
    const data = await fetch(`https://ideogram.ai/api/g/u?user_id=${userId}}&all_privacy=true&filters=everything`, {
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.6',
        authorization,
        'content-type': 'application/json',
        priority: 'u=1, i',
        'sec-ch-ua': '"Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1',
        traceparent: '00-fd16618b86ea493d9606d0c8536291fd-fd16618b86ea493d-00',
        'x-ideo-org': org_id,
        'x-request-id': getRequestId(),
        cookie,
        Referer: 'https://ideogram.ai/t/my-images',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      body: null,
      method: 'GET',
    });

    return await handleResponse(data);
  } catch (error) {
    console.error('Error fetching user gallery:', error);
    throw error;
  }
}

module.exports = { login, sample, retriveRequests, submit, userGallary, getSessionId };
