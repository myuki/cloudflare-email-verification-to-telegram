# cloudflare-email-verification-to-telegram

Use Cloudflare Email Worker to forward the verification code to Telegram. Be simple without additional dependency. 

## Environment Variable

| Name                | Description                                 | Example                                          |
| ------------------- | --------------------------------------------| ------------------------------------------------ |
| `BOT_TOKEN`         | The token of the Telegram bot               | `1234093335:SDASDatSDASDADSDryaasdasdasdaeweawe` |
| `FORWARD_ADDRESSES` | Forward the email to this address           | `example@example.com`                            |
| `TG_CHAT_IDS`       | List of Telegram chat IDs, separated by `,` | `-123,-456,-789`                                 |
