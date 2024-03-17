const tgBotToken = ""
const tgChatId = ""
const forwardAddress = ""

export default {
  async email(message, env, ctx) {
    if (forwardAddress.length > 0 && message.from !== forwardAddress)
      await message.forward(forwardAddress)

    const subject = message.headers.get("subject")
    const keywordList = ["verification", "验证码"]
    if (!keywordList.some(keyword => subject.includes(keyword)))
      return;

    const parsed = (await this.stream2Rfc822(message.raw))

    let text = `<i>${message.from} -&gt; ${message.to}</i>\n`
    text += `<b>${subject}</b>\n`

    const verification = await this.getVerificationFromRfc822(parsed)
    text += `<blockquote>${verification}</blockquote>`

    const body = JSON.stringify({
      "chat_id": tgChatId,
      "parse_mode": "HTML",
      "text": text.slice(0, 4096)
    });

    await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    }).then(response => response.json())
      .then(response => console.log(response))
      .catch(err => console.error(err));
  },

  async stream2Rfc822(stream) {
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
  },

  getVerificationFromRfc822(rfc822) {
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
  },
};
