export default {
  async email(message, env, ctx) {
    const forwardAddresses: string = env.FORWARD_ADDRESSES.trim()
    const botToken: string = env.BOT_TOKEN.trim()
    const tgChatIds: string = env.TG_CHAT_IDS.trim()

    const addressList = forwardAddresses.split(",")
    const forwardPromiseList = addressList.map((address) =>
      forwardToAddress(message, address)
    )

    if (!checkSubject(message)) {
      await Promise.all(forwardPromiseList)
      return
    }

    const chatIdList = tgChatIds.split(",")
    const text = await email2text(message)
    const sendPromiseList = chatIdList.map((chatId) =>
      sendToTg(botToken, chatId, text)
        .then((response) => response.json())
        .then((response) => console.log(response))
        .catch((err) => console.error(err))
    )

    await Promise.all([...forwardPromiseList, ...sendPromiseList])
  }
}

async function forwardToAddress(message, address: string) {
  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (address && emailReg.test(address))
    await message.forward(address)
}

function checkSubject(message): boolean {
  const keywordList = ["verification", "验证码"]
  const subject = message.headers.get("subject")
  return keywordList.some(keyword => subject.includes(keyword)) ? true : false
}

async function stream2Rfc822(stream: ReadableStream<Uint8Array>) {
  let chunkLen = 0
  let chunkList: Uint8Array[] = []
  const reader = stream.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    chunkList.push(value)
    chunkLen += value.length
  }

  const buf = new Uint8Array(chunkLen)
  let chunkPointer = 0
  for (let chunk of chunkList) {
    buf.set(chunk, chunkPointer)
    chunkPointer += chunk.length
  }
  const decoder = new TextDecoder()
  return decoder.decode(buf)
}

function getVerificationFromRfc822(rfc822: string): string {
  const contentIdx = rfc822.indexOf('Content-Type: text/html; charset="utf-8"')
  const contentEnd = rfc822.indexOf("--===============", contentIdx)
  const content = rfc822.slice(contentIdx, contentEnd).replace(/=(?:\r\n|\r|\n)/g, "")

  const htmlIdx = content.indexOf("<!doctype html>")
  const htmlEnd = content.indexOf("</html>", contentIdx) + 7
  const html = content.slice(htmlIdx, htmlEnd)

  const regex = />(\d{6,8})</
  const match = html.match(regex)
  const code = match?.[1] ?? ""

  return code
}

async function email2text(message): Promise<string> {
  const subject = message.headers.get("subject")
  const parsed = (await stream2Rfc822(message.raw))

  let text = `<i>${message.from} -&gt; ${message.to}</i>\n`
  text += `<b>${subject}</b>\n`

  const verification = getVerificationFromRfc822(parsed)
  text += `<blockquote>${verification}</blockquote>`

  return text
}

async function sendToTg(token: string, chatId: string, text: string): Promise<Response> {
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
