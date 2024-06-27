export default {
  async email(message, env, ctx) {
    const forwardAddress = env.FORWARD_ADDRESS.trim()
    const botToken = env.BOT_TOKEN.trim()
    const tgChatIds = env.TG_CHAT_IDS.trim()

    if (!botToken || !tgChatIds) {
      console.error("Missing required environment variables");
      return
    }

    if (checkAddress(forwardAddress))
      await message.forward(forwardAddress)

    if (!checkSubject(message))
      return;

    const chatIdList = getChatIdList(tgChatIds)
    const text = await email2text(message)
    for (const chatId of chatIdList) {
      await sendToTg(botToken, chatId, text).then(response => response.json())
        .then(response => console.log(response))
        .catch(err => console.error(err))
    }
  }
}

function checkSubject(message) {
  const keywordList = ["verification", "验证码"]
  const subject = message.headers.get("subject")
  if (keywordList.some(keyword => subject.includes(keyword)))
    return true
  else
    return false
}

function checkAddress(address) {
  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (address && emailReg.test(address))
    return true
  else
    return false
}

function getChatIdList(chatIds) {
  return chatIds.split(",")
}

async function stream2Rfc822(stream) {
  let chunkLen = 0;
  let chunks = [];
  const reader = stream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    chunkLen += value.length;
  }

  const buf = new Uint8Array(chunkLen);
  let chunkPointer = 0;
  for (let chunk of chunks) {
    buf.set(chunk, chunkPointer);
    chunkPointer += chunk.length;
  }
  const decoder = new TextDecoder()
  return decoder.decode(buf)
}

function getVerificationFromRfc822(rfc822) {
  const contentIdx = rfc822.indexOf('Content-Type: text/html; charset="utf-8"')
  const contentEnd = rfc822.indexOf("--===============", contentIdx)
  const content = rfc822.slice(contentIdx, contentEnd).replace(/=(?:\r\n|\r|\n)/g, "")

  const htmlIdx = content.indexOf("<!doctype html>")
  const htmlEnd = content.indexOf("</html>", contentIdx) + 7
  const html = content.slice(htmlIdx, htmlEnd)

  const regex = />(\d{6,8})</
  const match = html.match(regex)
  const code = match[1]

  return code
}

async function email2text(message) {
  const subject = message.headers.get("subject")
  const parsed = (await stream2Rfc822(message.raw))

  let text = `<i>${message.from} -&gt; ${message.to}</i>\n`
  text += `<b>${subject}</b>\n`

  const verification = await getVerificationFromRfc822(parsed)
  text += `<blockquote>${verification}</blockquote>`

  return text
}

async function sendToTg(token, chatId, text) {
  const body = JSON.stringify({
    "chat_id": chatId,
    "parse_mode": "HTML",
    "text": text.slice(0, 4096)
  })

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body,
  })
  return response
}
