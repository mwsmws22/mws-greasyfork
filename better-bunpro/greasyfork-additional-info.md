Small quality-of-life tweaks for [Bunpro](https://bunpro.jp) — features I wish Bunpro had. "Better" is just alliteration; if they want to ship any of these themselves, that would be great.

Open settings from the **sliders icon** in the site header (between Search and Help), in the quiz toolbar, or Tampermonkey → Better Bunpro → Settings.

### Show unverified example sentences for A1+ vocab

After a correct answer, show example sentences for A1+ vocab that Bunpro's website hides (the mobile app already shows them). A different sentence rotates each review session.

### Cycle example sentences with Tab

After a correct answer, press `Tab` to cycle through other example sentences for the same item. Your grade and the sentence your next review starts on stay unchanged.

Idea from [Joseph G](https://greasyfork.org/en/users/1613422-joseph-g)'s [Bunpro Sentence Cycle](https://greasyfork.org/en/scripts/584571-bunpro-sentence-cycle).

### Don't spoil the answer on a wrong guess

On Manual Translation–style reviews, Bunpro shows the correct answer as soon as you miss — so undo is pointless. With this on, a wrong guess is not submitted: nothing is revealed and your text stays so you can try again. To give up: clear the box and press `Enter`, or press `Enter` again on the same wrong answer.

### Add a wrong answer as a synonym

After a missed vocab translation, an **Add as synonym** button next to your guess (or press `S`) saves it and marks the review correct — no need to dig through More Info.

### Edit a wrong answer with Left Arrow

After a wrong typed answer, `Left Arrow` undoes without deleting — the full guess stays so you can fix a mistake in the middle. (`Backspace` still deletes the last character.)

### Play real speakers instead of TTS audio

When Bunpro would play synthesised term audio (**TTS** / text-to-speech), this prefers a recording of a person saying it instead — looked up the same way [Yomitan](https://github.com/yomidevs/yomitan) does (JapanesePod101, then Jisho). Play buttons are **white** for TTS and **blue** for real audio; the tooltip names the source (JPod101, Jisho, Bunpro TTS, or Bunpro Recording).

Source: [github.com/mwsmws22/mws-greasyfork](https://github.com/mwsmws22/mws-greasyfork/tree/main/better-bunpro)
