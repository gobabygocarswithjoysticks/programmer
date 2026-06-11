## [A website for programming and adjusting the settings of go baby go cars with joysticks.](https://gobabygocarswithjoysticks.github.io/programmer/)

Github for this (the website) code: https://github.com/gobabygocarswithjoysticks/programmer

Github for the Arduino code that gets uploaded by this website: https://github.com/gobabygocarswithjoysticks/car-code 
[![Compile](https://github.com/gobabygocarswithjoysticks/car-code/actions/workflows/compile.yml/badge.svg)](https://github.com/gobabygocarswithjoysticks/car-code/actions/workflows/compile.yml)

Tested on Google Chrome, Opera, and Edge (the only browsers that currently support Web Serial).

For any questions about how to use this website, please post [here](https://github.com/gobabygocarswithjoysticks/programmer/discussions/categories/support) or email gobabygocarswithjoysticks@gmail.com 

## Features

### programmable speed and acceleration limits

### joystick and/or button input

### [remote control](https://github.com/gobabygocarswithjoysticks/car-code/blob/main/rcdocs/remote_control.md)

### also compatible with the [GBG-PCB](https://github.com/gobabygocarswithjoysticks/gbg-pcb)

### automatic preset loading links
You can tell the website to load a settings preset into the car as soon as it connects by adding #preset=your-preset to the URL like this:
https://gobabygocarswithjoysticks.github.io/programmer/#preset=default 

Presets can be contributed to the library here: https://github.com/gobabygocarswithjoysticks/car-config-library

A preset file can be made by downloading the settings from a car and removing the settings that you don't want to include.
For example, if you only want to include the speed and acceleration limits, you can remove all of the settings except for those, and then by making a preset file for that you can make it easy to make a car drive in the way that you like.

## Acknowledgements

- This website uses [arduino-web-uploader](https://github.com/dbuezas/arduino-web-uploader) by David Buezas for uploading code to the car.

- This website uses [qrcodejs](https://github.com/davidshimjs/qrcodejs) by davidshimjs for generating qr codes to make wifi connection easier.

- This website uses [esptool-js](https://github.com/espressif/esptool-js) by Espressif Systems for uploading code to cars that use ESP32 boards.
