# HiggyFilter

HiggyFilter is a Chrome extension for filtering recurring promotions and mentions from your feeds. On YouTube Home, it can catch a sponsorship disclosed only in a video's description. Filtered items display a **Content hidden** card with a **Show anyway** button.

## Install in Chrome

1. [Download the repository ZIP](https://github.com/ozelali/higgyfilter/archive/refs/heads/main.zip) and extract it. You can also clone the repository:

   ```bash
   git clone https://github.com/ozelali/higgyfilter.git
   ```

2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the extracted or cloned folder that contains `manifest.json`.
4. Refresh any supported tabs you already have open.

To update, replace the files in the loaded folder (or run `git pull` in your clone), click **Reload** on the extension card in Chrome, and refresh your tabs.

## Using the filter

Filtering starts automatically on supported sites. Choose **Show anyway** to reveal just that item and use its normal links and controls. A small **Filtered content** label stays on the revealed card. Your choice lasts until you reload the page.

On YouTube Home, cards show **Checking video details…** near the viewport while the extension reads the linked video's metadata. If the lookup fails, the card becomes visible unless the card itself contains a match.

## Supported sites

| Site | What the extension checks |
| --- | --- |
| YouTube Home | Card text, links and labels, plus the linked video's title, channel name, description and keywords when available. |
| Other YouTube listings | Text, links and labels in supported video cards. |
| X / Twitter | Post text, account names, links and labels, including quoted content when it appears in the post card. |
| Reddit, Instagram and Threads | Best-effort filtering of text, links and labels in supported feed cards. |

The filter checks for predefined terms and related account names, so it can also hide reviews or other ordinary mentions. It cannot detect a match when the only signal is in audio, video frames or images without matching text or labels. Direct watch pages and post permalinks can still open. Changes to a site's layout can affect detection.

## Privacy

Filtering runs in your browser with no telemetry, API key or external backend. On YouTube Home, the extension requests metadata from YouTube watch pages on the same origin. Lookup results are cached in memory for the current page.

## Development and reporting issues

Load the repository as an unpacked extension using the steps above. No build step or dependencies are required. Run the matching and metadata parser tests with:

```bash
node --test
```

After changing the code, reload the extension and refresh a supported tab. To report a missed match, a false positive or a broken card, [open an issue](https://github.com/ozelali/higgyfilter/issues/new) with the site, a public example URL if available, and what you expected to happen. Remove personal information from screenshots or HTML samples.

## License

[MIT](LICENSE).
