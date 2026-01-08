# Me-Do-Solfege Ear Trainer

This project is a free and highly customizable tool for improving your functional / relative pitch. 

## Features
- History
- Customizeability
- Realism

## Design philosophy
The key skills you need to master are:
- Recognise and be able to remember the root note ("do") while other notes are playing
- Recognise the 7 notes of the scale relative to the root. This must be done instantly even when you're hearing sequences of several tones with an arbitrary tempo and with any diatonic chord in the background, so you need to learn the unique feel of each one. 
- Recognise just the smallest intervals - knowing just 2nd (consecutive notes = tone/semitone) and 3rd (next note but one = 3-4 semitones) is all that's really required since these are by far the most common; use note recognition for any bigger jumps. 

For final mastery, extend recognition to the 7 notes when they appear an octave lower or higher (compound intervals), and the "outside" #/b notes (though once you can recognize the 7 scale notes reliably this will become a lot easier). 

For minor keys (and modal pieces), some people prefer to treat "do" as the root and learn to recognize the minor 3rd and minor 7th interval... but in my opinion it's easier for name the tonal centre for minor pieces "la", and then you can just use the same 7 notes you already learn only starting from a different point.  

## Implementation

Many thanks to the excellent [Loveable](https://lovable.dev) AI tooling for doing most of the early heavy lifting in this project.

Since this application runs entirely on the client, if you want any new features or changes you can simply clone it and make them in your own version. But do make a PR to share it back to this project if you think others would find it useful. 

The only requirement for building is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## License
Me-Do-Solfege is made available under the [MIT](https://mit-license.org/) license.  
Copyright (C) Ben Spiller 2025-present. 


### Third party licenses and attributions
Thanks and credit to some great third party tools and libraries that helped make this possible.

This project makes use of pre-rendered audio assets provided by [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts).License is [MIT](https://mit-license.org/). Copyright (C) 2012 Benjamin Gleitzman (gleitz@mit.edu).

The sound assets in midi-js-soundfonts are derived, pre-rendered assets created from the **FluidR3_GM.sf2** General MIDI soundfont. Changes were made by midi-js-soundfonts to convert the original SF2 format into WebAudio/JSON soundfont assets for use in browser-based MIDI playback. FluidR3_GM.sf2 is licensed under the [Creative Commons Attribution 3.0 (CC BY 3.0)](https://creativecommons.org/licenses/by/3.0/). Original source for that was packaged by Ubuntu in the `fluid-soundfont-gm` package, maintained by Toby Smithe `<tsmithe@ubuntu.com>`. 
