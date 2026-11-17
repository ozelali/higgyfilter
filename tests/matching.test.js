const assert = require("node:assert/strict");
const test = require("node:test");
require("../matching.js");

const { mentionsBrand, youtubeVideoId, matchWatchPage } = globalThis.HiggyFilterMatching;

test("recognizes brand spellings, account names and linked domains", () => {
  for (const signal of ["Higgsfield", "Higgs Field", "higgs-field", "@higgsfieldai", "https://higgsfield.ai/deal"]) {
    assert.equal(mentionsBrand(signal), true, signal);
  }
  for (const unrelated of ["Higgs boson", "higgsfielder", "unrelated video", undefined]) {
    assert.equal(mentionsBrand(unrelated), false, unrelated);
  }
});

const id = "aBc123xYz_-";

test("accepts YouTube watch and Shorts links only", () => {
  assert.equal(youtubeVideoId(`/watch?v=${id}&t=20`), id);
  assert.equal(youtubeVideoId(`/shorts/${id}`), id);
  assert.equal(youtubeVideoId(`https://example.org/watch?v=${id}`), null);
  assert.equal(youtubeVideoId("/watch?v=short"), null);
});

function watchHtml(details) {
  return `<script>var ytInitialPlayerResponse = ${JSON.stringify({ videoDetails: details })};</script>`;
}

test("detects description-only sponsorships and handles JSON string punctuation", () => {
  const html = watchHtml({ videoId: id, title: "Cinema", shortDescription: 'An example } " followed by Higgsfield' });
  assert.equal(matchWatchPage(html, id), true);
  assert.equal(matchWatchPage(html, "differentId"), null);
});

test("distinguishes a clean description from unavailable metadata", () => {
  assert.equal(matchWatchPage(watchHtml({ videoId: id, shortDescription: "" }), id), false);
  assert.equal(matchWatchPage(watchHtml({ videoId: id }), id), null);
  assert.equal(matchWatchPage("<html>Consent required</html>", id), null);
});
