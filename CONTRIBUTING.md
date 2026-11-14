# Contributing to Mee

Thank you for helping. The most useful contributions right now:

- **Ground truth.** You know an area and the fire level looks wrong? Open an issue with the township, the dates and what you saw.
- **Burmese translation** of the website and the Telegram bot.
- **Bugs** on phones and slow connections. Most users in Myanmar are on mobile data.
- **Method review** from fire or remote-sensing researchers.

## Before you start

- For anything bigger than a small fix, open an issue first so we can agree on the approach.
- Read the [Code of Conduct](CODE_OF_CONDUCT.md).
- Never commit secrets, `.env` files or the raw `data/` folder.

## Set up

See [Development setup](README.md#development-setup) in the README. The website runs without the pipeline.

## Making a change

1. Fork the repository and create a branch: `git checkout -b fix/short-name`
2. Make the change. Keep it focused on one thing.
3. Check it:
   - Web: `cd web && npm run lint && npm run build`
   - Pipeline: run `python update_all.py --skip-download` and check that the numbers still make sense
4. Write a clear commit message in plain English: `Fix calendar overflow on small phones`
5. Open a pull request and fill in the template.

## Style

- **Copy:** short sentences, plain words, sentence case. Say what things do for the user.
- **Code:** TypeScript strict mode for web. Python with type hints for the pipeline. No new dependency without a reason.
- **Data:** never change a number by hand. Change the pipeline and regenerate.

## Data changes

If your change affects the numbers (filters, calibration, normals), say in the pull request:

- what changed and why
- how the validation results changed (on the How it works page)
- one or two areas where you checked the result

## License

By contributing, you agree that your work is released under the [MIT License](LICENSE).
