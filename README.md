# Learn-ti-do Solfege Ear Trainer

This project is a free and highly customizable tool for improving your functional / relative pitch. 

## Features

## Design philosophy
TODO

## Implementation

Many thanks to the excellent [Loveable](https://lovable.dev) AI tooling for doing most of the heavy lifting in this project.

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
Learn-ti-do is made available under the [MIT](https://mit-license.org/) license.  
Copyright (C) Ben Spiller 2025-present. 


### Third party licenses and attributions
Thanks and credit to some great third party tools and libraries that helped make this possible.

This project makes use of pre-rendered audio assets provided by [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts).License is [MIT](https://mit-license.org/). Copyright (C) 2012 Benjamin Gleitzman (gleitz@mit.edu).

The sound assets in midi-js-soundfonts are derived, pre-rendered assets created from the **FluidR3_GM.sf2** General MIDI soundfont. Changes were made by midi-js-soundfonts to convert the original SF2 format into WebAudio/JSON soundfont assets for use in browser-based MIDI playback. FluidR3_GM.sf2 is licensed under the [Creative Commons Attribution 3.0 (CC BY 3.0)](https://creativecommons.org/licenses/by/3.0/). Original source for that was packaged by Ubuntu in the `fluid-soundfont-gm` package, maintained by Toby Smithe `<tsmithe@ubuntu.com>`. 
