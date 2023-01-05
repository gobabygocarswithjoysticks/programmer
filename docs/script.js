var configurations_info = null; // the configuration file pulled from https://github.com/gobabygocarswithjoysticks/car-code/blob/main/hex/configurations-info.txt which has info about what programs are available to upload
var options = null; // configurations_info, but just the lines with program info
var port = null; // serial port for connection to car
var reader = null; // reads from the serial port
var serial_connected_indicator_warning_timeout; // the result of a setInterval() used to display a warning message if the car is taking a long time to send a valid message
var serialConnectionRunning = false; // boolean, is a car connected?
var sendStringSerialLock = false; // boolean, prevents sendStringSerial from being used more than once at a time (sendStringSerial just exits without sending a message if a message is in the process of being sent.
var live_data = null; // the live data that the car reports (Json) (used for joystick calibration and other displays)
var last_live_data = null; // the previous live data that the car reports (Json) (used for joystick calibration)
var settings_received = false; // have valid settings been received yet?
var showEverything = false; //if the "show all the options at once button is pressed, all the settings will also be shown when they load
var speedAdjustHelp = false; //help make adjusting the speed as easy as possible
var help_info_highlight_id = null; // used to highlight the most recently requested setting info row
var follow_the_dot = null; // used to sequence joystick calibration by "follow the dot"
var ftd_data = {}; // used to store data used for joystick calibration by "follow the dot"
var joy_calib_deadzone = 3; //joystick signal noise should be below this
var joy_calib_moved_enough = 40; // far enough from center to be an edge
document.addEventListener('DOMContentLoaded', async function () {
    // runs on startup
    // check if web serial is enabled
    if (!("serial" in navigator)) {
        var x = document.getElementsByClassName("serial-alert");
        for (var i = 0; i < x.length; i++) {
            x[i].innerHTML = "Web Serial is not available, so this site won't be able to communicate with your car. Please use Google Chrome, Opera, or Edge, and make sure Web Serial is enabled.";
        }
    }
    document.getElementById("options-buttons").style.backgroundColor = "white";
    document.getElementById("serial-disconnect-button").hidden = true;

    updateUpload(); // get the compiled code from github

    // hide sections of the website and change the background color to help guide users.
    document.getElementById("upload-program").hidden = true;
    document.getElementById("connect-to-car").hidden = true;
    document.getElementById("configure-car").hidden = true;
    document.getElementById("upload-program").style.backgroundColor = "lightgrey";
    document.getElementById("connect-to-car").style.backgroundColor = "lightgrey";
    document.getElementById("configure-car").style.backgroundColor = "lightgrey";


    // watch the upload-progress span to get information about the program upload progress (I wish I could more directly get information from arduino-web-uploader but this works)
    const observer = new MutationObserver(mutationRecords => {
        if (mutationRecords[0].addedNodes[0].data === "Done!") {
            document.getElementById("upload-program").style.backgroundColor = "lightgrey";
            document.getElementById("connect-to-car").style.backgroundColor = "white";
            document.getElementById("connect-to-car").hidden = false;
            document.getElementById("connect-to-car").scrollIntoView();

            var x = document.getElementsByClassName("upload-info");
            for (var i = 0; i < x.length; i++) {
                x[i].innerHTML = "Upload complete!"
            }
            document.getElementById("upload-button").style.outline = "0px";

            cbdone("hcbp-uploading", "hcbp-upload-done");

        } else if (mutationRecords[0].addedNodes[0].data === "Error!") {
            var x = document.getElementsByClassName("upload-info");
            for (var i = 0; i < x.length; i++) {
                x[i].innerHTML = 'Error Uploading! Check the USB cable, board, and port selections, then press the upload button to the left to try again.';
            }
            document.getElementById("hcbp-upload-info").innerHTML = 'Error Uploading! Check the board and port selections, then press the <span style="border:3px solid red;">upload button</span> to the left to try again.';
            document.getElementById("hcbp-uploading").scrollIntoView({ block: "end" });


            document.getElementById("upload-button").style.outline = "3px solid red";
        } else if (mutationRecords[0].addedNodes[0].data === "0%") {
            document.getElementById("upload-connect-comment").hidden = true;
            document.getElementById("upload-program").style.backgroundColor = "white";
            document.getElementById("connect-to-car").style.backgroundColor = "lightgrey";

            var x = document.getElementsByClassName("upload-info");
            for (var i = 0; i < x.length; i++) {
                x[i].innerHTML = "Upload starting..."
            }
            document.getElementById("hcbp-uploading").scrollIntoView({ block: "end" });
        } else if (mutationRecords[0].addedNodes[0].data === "Ready") {
        } else {
            var x = document.getElementsByClassName("upload-info");
            for (var i = 0; i < x.length; i++) {
                // draw progress bar
                x[i].innerHTML = 'Uploading ' + mutationRecords[0].addedNodes[0].data + '\xa0complete. <br>'
                    + '</div> <div style="width:100%; background-color:#ddd;"> <div style="width:'
                    + mutationRecords[0].addedNodes[0].data
                    + '; background-color: #04AA6D; height: 30px;"></div></div>';
            }
            if (mutationRecords[0].addedNodes[0].data === "1%") {
                document.getElementById("hcbp-uploading").scrollIntoView({ block: "end" });
            }
        }

    });
    observer.observe(document.getElementById("upload-progress"), {
        childList: true
    });


    var url_tail = window.location.href.substring(window.location.href.lastIndexOf('#') + 1);
    if (url_tail === "new") {
        document.getElementById("first-time-program-button").click();
    }
    if (url_tail === "speed") {
        document.getElementById("speed-adjust-help-button").click();
    }
    setTimeout(function () {
        document.getElementById("pointer-arrow").style.color = "Lime";
        setTimeout(function () {
            document.getElementById("pointer-arrow").style.color = "magenta";
            setTimeout(function () {
                document.getElementById("pointer-arrow").style.color = "Lime";
                setTimeout(function () {
                    document.getElementById("pointer-arrow").style.color = "magenta";
                }, 150);
            }, 150);
        }, 150);
    }, 550);


});
// the "I want to program a car" button was pressed, show the relevant section
function showFirstTime() {
    showEverything = false;
    document.getElementById("upload-program").style.backgroundColor = "white";
    document.getElementById("upload-program").hidden = false;

    document.getElementById("connect-to-car").hidden = true;
    document.getElementById("connect-to-car").style.backgroundColor = "lightgrey";

    document.getElementById("configure-car").hidden = true;
    document.getElementById("configure-car").style.backgroundColor = "lightgrey";
    document.getElementById("options-buttons").style.backgroundColor = "lightgrey";

    document.getElementById("upload-program").scrollIntoView();

    document.getElementById("help-upload").scrollIntoView();
    document.getElementById("hcbs-plug").style.outline = "";
}
// the "I want to change the settings of a car" button was pressed, show the relevant section
function showConfigButton() {
    showEverything = false;
    document.getElementById("upload-program").hidden = true;
    document.getElementById("upload-program").style.backgroundColor = "lightgrey";

    if (!serialConnectionRunning) {
        document.getElementById("connect-to-car").style.backgroundColor = "white";
        document.getElementById("connect-to-car").hidden = false;

        document.getElementById("configure-car").hidden = true;
        document.getElementById("configure-car").style.backgroundColor = "lightgrey";
        document.getElementById("options-buttons").style.backgroundColor = "lightgrey";
    } else {
        document.getElementById("connect-to-car").style.backgroundColor = "lightgrey";
        document.getElementById("connect-to-car").hidden = false;

        document.getElementById("configure-car").hidden = false;
        document.getElementById("configure-car").style.backgroundColor = "white";
        document.getElementById("options-buttons").style.backgroundColor = "lightgrey";
    }

    document.getElementById("help-settings").scrollIntoView();
    document.getElementById("hcbp-start").style.outline = "";
}
// the "I want to see everything at once" button was pressed
function showEverythingButton() {
    showEverything = true;
    document.getElementById("upload-program").style.backgroundColor = "white";
    document.getElementById("connect-to-car").style.backgroundColor = "white";
    document.getElementById("configure-car").style.backgroundColor = "white";
    document.getElementById("options-buttons").style.backgroundColor = "lightgrey";

    document.getElementById("upload-program").hidden = false;
    document.getElementById("connect-to-car").hidden = false;
    document.getElementById("configure-car").hidden = false;

    showAllSettings(false);
}
// disconnects the serial connection
async function closeSerial() {
    try {
        await reader.cancel();
    } catch (e) {
        serialConnectionRunning = false;
        // if reader.cancel succeeded, connectToSerial sets serialConnectionRunning to false after the loop in that function exits.
    }
    document.getElementById("serial-disconnect-button").hidden = true;
    document.getElementById("serial-connect-button").hidden = false;
    document.getElementById("configure-car").style.backgroundColor = "lightgrey";
    document.getElementById("connect-to-car").style.backgroundColor = "white";

}
// sends the given string over serial, if connected and if nothing else is in the process of being sent. 
async function sendStringSerial(string) {
    if (!serialConnectionRunning) { return; }
    if (sendStringSerialLock) { return; }
    if (port == null) { return; }
    sendStringSerialLock = true;
    const writer = port.writable.getWriter();
    try {
        var enc = new TextEncoder(); // always utf-8
        await writer.write(enc.encode(string));
    } catch (e) {

    } finally {
        writer.releaseLock();
    }
    sendStringSerialLock = false;
}
// connect to serial connection (makes a popup asking what port to use)
async function connectToSerial() {
    if (serialConnectionRunning) return;
    serialConnectionRunning = true;
    document.getElementById('serial-connected-indicator').innerHTML = "trying to connect...";
    document.getElementById('serial-connected-short').innerHTML = 'trying to connect...';


    document.getElementById("serial-connect-button").hidden = true;
    document.getElementById("serial-disconnect-button").hidden = false;


    try {
        port = await navigator.serial.requestPort();
        serial_connected_indicator_warning_timeout = setTimeout(() => {
            document.getElementById('serial-connected-indicator').innerHTML = 'trying to connect... It is taking a long time, try pressing the <span id="serial-con-msg-time-disbut">disconnect button to the left</span> then reconnect by pressing the <span id="serial-con-msg-time-conbut">connect button to the left</span> after checking the port. Also try closing other tabs or Arduino windows that might be connected to the car, unplugging and unplugging the car, and uploading the code again.';
            document.getElementById('serial-connected-short').innerHTML = 'trying to connect... It is taking a long time, try disconnecting and reconnecting.';

            document.getElementById('serial-disconnect-button').style.border = "3px solid red";
            document.getElementById('serial-con-msg-time-disbut').style.border = "3px solid red";
            document.getElementById('serial-connect-button').style.border = "3px solid Blue";
            document.getElementById('serial-con-msg-time-conbut').style.border = "3px solid Blue";
            document.getElementById("serial-connected-indicator").scrollIntoView({ block: "end" });
        }, 3000);
        await port.open({ baudRate: 115200 });
    } catch (e) { // port selection canceled
        serialConnectionRunning = false;
        clearInterval(serial_connected_indicator_warning_timeout);
        document.getElementById('serial-connected-indicator').innerHTML = 'Did not connect. If you did not cancel the connection, try closing other tabs or Arduino windows that might be connected to the car. Then, try to connect again by pressing <span id="ser-con-canceled">the connect button to the left</span>.';
        document.getElementById('serial-connected-short').innerHTML = 'Did not connect. Try again';

        document.getElementById('serial-connect-button').style.border = "3px solid LimeGreen";
        document.getElementById('ser-con-canceled').style.border = "3px solid LimeGreen";
        document.getElementById("hcbs-connect").scrollIntoView({ block: "end" });

        document.getElementById("serial-connect-button").hidden = false;
        document.getElementById("serial-disconnect-button").hidden = true;

        document.getElementById("configure-car").style.backgroundColor = "lightgrey";
        document.getElementById("connect-to-car").style.backgroundColor = "white";

        return;
    }

    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    let string = "";
    settings_received = false;

    try {
        while (true) { // this (async) function loops for as long as it is connected in order to continuously get data from the car
            const { value, done } = await reader.read(); // https://web.dev/serial/
            if (done) {
                reader.releaseLock();
                break;
            }
            // value is a string with the characters that were just read from the serial port (usually a fragment of a full message)
            string += value;
            if (string.length > 10000) { // avoid the string getting extremely long if no terminating character is being sent (a car sending valid messages sends terminating characters, so it's fine to just toss the data)
                string = "";
            }
            if (value.includes("\n")) {
                let json = null;
                let serialStringLength = 0;
                try {
                    string = string.substring(
                        string.indexOf("{"),
                        string.indexOf("}") + 1
                    );
                    if (string != null)
                        json = JSON.parse(string);
                    serialStringLength = string.length;
                } catch (e) {
                    // had an error with parsing the data
                    string = "";
                }
                if (json != null) {
                    try {
                        gotNewSerial(json, serialStringLength);
                    } catch (e) {
                        console.log(e);
                    }
                }
                string = "";
            }
        }
    } catch (e) {
        // this happens if the arduino is unplugged from the computer
        console.log(e);
        serialConnectionRunning = false;
        reader.releaseLock();
        document.getElementById('serial-connected-indicator').innerHTML = "DISCONNECTED! you can connect again using the button to the left if you want.";
        document.getElementById('serial-connected-short').innerHTML = 'Disconnected!';

        document.getElementById("serial-connect-button").hidden = false;
        document.getElementById("serial-disconnect-button").hidden = true;

        document.getElementById("configure-car").style.backgroundColor = "lightgrey";
        document.getElementById("connect-to-car").style.backgroundColor = "white";

        document.getElementById("connect-to-car").scrollIntoView();

    }

    await readableStreamClosed.catch(() => { /* Ignore the error */ });

    await port.close();
    serialConnectionRunning = false;
}
// data is the data just received from the Arduino, in JSON form. Handle all the types of messages here:
function gotNewSerial(data, length) {
    if (data["current values, millis:"] != null && settings_received) {
        gotNewData(data, length);
    } else if (data["current settings, version:"] != null) {
        gotNewSettings(data, length);
        cancelFollowTheDot();
    } else if (data["result"] != null) {
        gotNewResult(data);
    } else {
        if (data["error"] != null) {
            if (data["error"] === "eeprom failure") {
                document.getElementById("eepromFailureMessageSpace").innerHTML = `The memory that stores the settings for the car has been corrupted and the settings could not be recalled, so the car is now in failsafe mode.
                 <br>If you have seen this warning before, or to prevent it happening again since this error is a symptom of an Arduino having problems,
                  the recommended action is to replace the Arduino board.`
                    + `<br>You can use the following steps to exit the failsafe mode:`
                    + `<br> 1. Press the "I want to upload code to a new car" button above`
                    + `<br> 2. Select the "clear_eeprom" program`
                    + `<br> 3. Press the Upload! button`
                    + `<br> 4. After the upload finishes, wait a few seconds for the builtin LED on the Arduino to turn off.`
                    + `<br> 5. Re-upload the gbg_program code as if it were a new car.`
                    + `<br> 6. All the settings are back to the defaults. Change all the settings for your car again. Sorry.`
                    + `<br>Alternatively, you could try the <a target="_blank" rel="noopener noreferrer" href="https://github.com/gobabygocarswithjoysticks/classic">classic car code </a> which doesn't use the EEPROM.`
                    + `<br>Please email <a href="mailto: gobabygocarswithjoysticks@gmail.com">gobabygocarswithjoysticks@gmail.com</a> with any questions.`;
                document.getElementById("eepromFailureMessageSpace").hidden = false;
                document.getElementById("eepromFailureMessageSpace").scrollIntoView();
                alert('Error detected! You are probably wondering why your car is not moving and the Arduino board is blinking SOS in morse code. The memory that holds the settings for the car has been corrupted and the settings could not be recalled, so the car is now in failsafe mode. This probably means that the Arduino has bad EEPROM memory, so the recommended action is to replace the Arduino, especially if you receive this warning more than once. Press OK and this information will be repeated on the website, and there will be a way to exit the failsafe mode.');
            }
        }
        console.log("unexpected message: ");
        if (!settings_received) {
            console.log("no valid settings were received so data is being discarded");
        }
        console.log(data);
        // not an expected message
    }
}
// handle the message from the Arduino where it prints current readings and values.
function gotNewData(data, slength) {
    if (data["CHECKSUM"] != slength) {
        console.log("live data checksum fail. Actual: " + slength + " reported: " + data["CHECKSUM"]);
        console.log(data);
        return;
    }
    last_live_data = live_data;
    live_data = data;
    if (data["joyOK"] != null) {
        if (data["current values, millis:"] > 3000) {
            document.getElementById(`joystick-not-centered-message`).hidden = data["joyOK"];
        }
    }

    var elements = document.getElementsByClassName("liveVal-joyX"); // adding a span with class=liveVal-joyX to the html displays the most recently received 
    for (var i = 0; i < elements.length; i++) {
        elements[i].innerHTML = data["joyXVal"];
        elements[i].innerHTML = elements[i].innerHTML.padEnd(4, '\xa0'); // \xa0 is a non breaking space
    }
    var elements = document.getElementsByClassName("liveVal-joyY");
    for (var i = 0; i < elements.length; i++) {
        elements[i].innerHTML = data["joyYVal"];
        elements[i].innerHTML = elements[i].innerHTML.padEnd(4, '\xa0');
    }

    var elements = document.getElementsByClassName("liveVal-speedKnobVal");
    for (var i = 0; i < elements.length; i++) {
        elements[i].innerHTML = data["speedKnobVal"];
        elements[i].innerHTML = elements[i].innerHTML.padEnd(4, '\xa0');
    }

    var elements = document.getElementsByClassName("liveVal-movementAllowed");
    for (var i = 0; i < elements.length; i++) {
        elements[i].innerHTML = data["movementAllowed"] ? "on" : "<mark>off<mark>";
        document.getElementById("motors-on-off-button").innerHTML = (data["movementAllowed"] ? "turn motors off" : "turn motors on");
        document.getElementById("motors-on-off-button").setAttribute("onclick", `sendStringSerial("` + (data["movementAllowed"] ? "S," : "G,") + `")`);
    }

    drawJoystickCanvas("joystick-input-canvas", data["turnInput"], data["speedInput"]);
    drawJoystickCanvas("scaled-input-canvas", data["turnProcessed"], data["speedProcessed"]);
    drawJoystickCanvas("smoothed-input-canvas", data["turnToDrive"], data["speedToDrive"]);

    drawMotorSignal(true, "motor-signal-canvas", 60, data, "left");
    drawMotorSignal(false, "motor-signal-canvas", 120, data, "right");

    if (follow_the_dot != null) {
        followTheDot();
    }

}

function followTheDot() {
    if (follow_the_dot == null) {
        follow_the_dot = 0;
    }
    if (follow_the_dot === 0) {
        ftd_data = {};
        var elements = document.getElementsByClassName("car-setting-row");
        for (var i = 0; i < elements.length; i++) {
            elements[i].hidden = true; // hide all settings
        }

        document.getElementById('settings-header').innerHTML = '<button onclick="cancelFollowTheDot();">cancel calibration</button><br> Please do not touch the joystick yet. Joystick calibration will start in 5 seconds.';
        document.getElementById('settings-header').style.border = "4px solid magenta";
        document.getElementById('settings-header').scrollIntoView();
        follow_the_dot = 2;
    } else if (follow_the_dot === 2) {
        ftd_data["cx"] = live_data["joyXVal"];
        ftd_data["cy"] = live_data["joyYVal"];
        document.getElementById('settings-header').innerHTML = '<button onclick="cancelFollowTheDot();">cancel calibration</button><br> Please quickly push and hold the joystick to the displayed position: <span id="follow_the_dot_span"></span><br><canvas id="follow_the_dot_canvas" width="100" height="100"></span>';
        follow_the_dot = 3;
    } else if (follow_the_dot === 3) { // forwards
        document.getElementById("follow_the_dot_span").innerHTML = "FORWARDS";
        followTheDotDrawOnCanvas("f");
        if (Math.abs(live_data["joyYVal"] - ftd_data["cy"]) > joy_calib_moved_enough && Math.abs(last_live_data["joyYVal"] - ftd_data["cy"]) > joy_calib_moved_enough && Math.abs(live_data["joyYVal"] - last_live_data["joyYVal"]) < joy_calib_deadzone) { // moved in y and held
            if (Math.abs(live_data["joyXVal"] - ftd_data["cx"]) <= joy_calib_moved_enough) { // and x is still centered
                ftd_data["f"] = live_data["joyYVal"];
                follow_the_dot = 4;
                document.getElementById("follow_the_dot_span").innerHTML = "BACKWARDS";
                followTheDotDrawOnCanvas("b");
                return; // normal procedure, continue
            } else { // x moved significantly also
                follow_the_dot = null;
                document.getElementById("settings-header").innerHTML = 'Calibration canceled because movement was detected on both axes. Please check the the joystick pin settings and then restart the joystick calibration, and carefully move the joystick on only one axis at a time. <br> <button onclick="followTheDot();">restart</button><br>';
                var elements = document.getElementsByClassName("car-setting-row");
                for (var i = 0; i < elements.length; i++) {
                    if (Array("setting---JOY_X_PIN", "setting---JOY_Y_PIN").indexOf(elements[i].id) > -1) {
                        elements[i].hidden = false;
                    } else {
                        elements[i].hidden = true;
                    }
                }
                return;
            }
        } // returns if the if statement was true
        if (Math.abs(live_data["joyXVal"] - ftd_data["cx"]) > joy_calib_moved_enough && Math.abs(last_live_data["joyXVal"] - ftd_data["cx"]) > joy_calib_moved_enough && Math.abs(live_data["joyXVal"] - last_live_data["joyXVal"]) < joy_calib_deadzone) { // moved in x and because earlier ifs didn't happen, not in y (pins swapped)
            document.getElementById("settings-header").innerHTML = "Calibration canceled because it seems that the x and y joystick pins are swapped. It is recommended that you correct the joystick pin settings and then restart the joystick calibration. <br>"
                + '<button onclick="swapxandypins(); followTheDot();" style="background-color:Chartreuse">swap x and y pins and restart</button> <br> <button onclick="followTheDot();">restart</button>';

            var elements = document.getElementsByClassName("car-setting-row");
            for (var i = 0; i < elements.length; i++) {
                if (Array("setting---JOY_X_PIN", "setting---JOY_Y_PIN").indexOf(elements[i].id) > -1) {
                    elements[i].hidden = false;
                } else {
                    elements[i].hidden = true;
                }
            }

            follow_the_dot = null;
        }
    } else if (follow_the_dot === 4) {
        if (Math.abs(live_data["joyYVal"] - ftd_data["cy"]) > joy_calib_moved_enough && Math.abs(last_live_data["joyYVal"] - ftd_data["cy"]) > joy_calib_moved_enough && Math.abs(live_data["joyYVal"] - last_live_data["joyYVal"]) < joy_calib_deadzone
            && (((live_data["joyYVal"] - ftd_data["cy"]) > 0) != ((ftd_data["f"] - ftd_data["cy"]) > 0))) { // moved opposite direction in y and held
            ftd_data["b"] = live_data["joyYVal"];
            document.getElementById("follow_the_dot_span").innerHTML = "LEFT";
            followTheDotDrawOnCanvas("l");
            follow_the_dot = 5;
        }
    } else if (follow_the_dot === 5) {
        if (Math.abs(live_data["joyXVal"] - ftd_data["cx"]) > joy_calib_moved_enough && Math.abs(last_live_data["joyXVal"] - ftd_data["cx"]) > joy_calib_moved_enough && Math.abs(live_data["joyXVal"] - last_live_data["joyXVal"]) < joy_calib_deadzone) { // moved in x and held
            ftd_data["l"] = live_data["joyXVal"];
            document.getElementById("follow_the_dot_span").innerHTML = "RIGHT";
            followTheDotDrawOnCanvas("r");
            follow_the_dot = 6;
        }
    } else if (follow_the_dot === 6) {
        if (Math.abs(live_data["joyXVal"] - ftd_data["cx"]) > joy_calib_moved_enough && Math.abs(last_live_data["joyXVal"] - ftd_data["cx"]) > joy_calib_moved_enough && Math.abs(live_data["joyXVal"] - last_live_data["joyXVal"]) < joy_calib_deadzone
            && (((live_data["joyXVal"] - ftd_data["cy"]) > 0) != ((ftd_data["l"] - ftd_data["cx"]) > 0))) { // moved opposite direction in x and held
            ftd_data["r"] = live_data["joyXVal"];
            follow_the_dot = 7;
            document.getElementById("settings-header").innerHTML = "processing...";
        }
    } else if (follow_the_dot === 7) {
        document.getElementById('setting---' + "CONTROL_RIGHT").children[1].firstChild.value = ftd_data["r"];
        onSettingChangeFunction("CONTROL_RIGHT");
        follow_the_dot = 8;
    } else if (follow_the_dot === 8) {
        document.getElementById('setting---' + "CONTROL_CENTER_X").children[1].firstChild.value = ftd_data["cx"];
        onSettingChangeFunction("CONTROL_CENTER_X");
        follow_the_dot = 9;
    } else if (follow_the_dot === 9) {
        document.getElementById('setting---' + "CONTROL_LEFT").children[1].firstChild.value = ftd_data["l"];
        onSettingChangeFunction("CONTROL_LEFT");
        follow_the_dot = 10;
    } else if (follow_the_dot === 10) {
        document.getElementById('setting---' + "CONTROL_UP").children[1].firstChild.value = ftd_data["f"];
        onSettingChangeFunction("CONTROL_UP");
        follow_the_dot = 11;
    } else if (follow_the_dot === 11) {
        document.getElementById('setting---' + "CONTROL_CENTER_Y").children[1].firstChild.value = ftd_data["cy"];
        onSettingChangeFunction("CONTROL_CENTER_Y");
        follow_the_dot = 12;
    } else if (follow_the_dot === 12) {
        document.getElementById('setting---' + "CONTROL_DOWN").children[1].firstChild.value = ftd_data["b"];
        onSettingChangeFunction("CONTROL_DOWN");

        document.getElementById("settings-header").innerHTML = "calibration done!";

        follow_the_dot = null;
        showJoystickSettings();
    }




}

function cancelFollowTheDot() {

    follow_the_dot = null;
    document.getElementById("settings-header").style.border = "";
    document.getElementById("settings-header").innerHTML = "";
}
function followTheDotDrawOnCanvas(dir) {
    let canvas = document.getElementById("follow_the_dot_canvas");
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.lineWidth = "2";
    ctx.strokeStyle = "grey";
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.stroke();
    ctx.closePath();
    ctx.beginPath();
    ctx.arc(50 + (dir === "r" ? 35 : 0) + (dir === "l" ? -35 : 0), 50 - (dir === "f" ? 35 : 0) - (dir === "b" ? -35 : 0), 15, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.closePath();

}

function drawMotorSignal(clear, canvasID, xpos, data, side) {
    // motor-signal-canvas
    let canvas = document.getElementById(canvasID);
    let ctx = canvas.getContext("2d");
    if (clear) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    ctx.beginPath();
    ctx.lineWidth = "2";
    ctx.strokeStyle = "grey";
    ctx.rect(xpos, 10, 40, 200);
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.lineWidth = "2";
    ctx.strokeStyle = "grey";
    ctx.moveTo(xpos, canvas.height / 2);
    ctx.lineTo(xpos + 40, canvas.height / 2);
    ctx.stroke();
    ctx.closePath();
    ctx.beginPath();
    ctx.fillStyle = "green";

    var grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grd.addColorStop(0, "orange");
    grd.addColorStop(.5, "green");
    grd.addColorStop(1, "orange");
    ctx.fillStyle = grd;
    let centerSignal = document.getElementById('setting---' + side.toUpperCase() + "_MOTOR_CENTER").children[1].firstChild.value;
    let fastSignal = document.getElementById('setting---' + side.toUpperCase() + "_MOTOR_FAST".toUpperCase()).children[1].firstChild.value;
    let h = (data[side + "MotorWriteVal"] - centerSignal) * -100 / fastSignal;
    ctx.fillRect(xpos, canvas.height / 2, 40, h);
    ctx.closePath();
    ctx.beginPath();
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText(data[side + "MotorWriteVal"], xpos + (side === "left" ? -51 : 45), canvas.height / 2 + h + 10);
    ctx.closePath();
}
function drawJoystickCanvas(canvasID, vx, vy) {
    // draw to joystick input display canvas
    let canvas = document.getElementById(canvasID);
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.lineWidth = "2";
    ctx.strokeStyle = "grey";
    ctx.rect(10, 10, 200, 200);
    ctx.stroke();
    ctx.closePath();
    let x = vx * 100 + 110;
    let y = vy * -100 + 110;
    ctx.beginPath();
    ctx.lineWidth = "1";
    ctx.strokeStyle = "grey";
    ctx.moveTo(canvas.width / 2, canvas.height / 2);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.closePath();

    if (Math.abs(vx) > 0.001) { // if only one axis is off zero, the off axis one is always displayed on top
        ctx.beginPath();
        ctx.lineWidth = "5";
        if (Math.abs(vy) < 0.001) { //within 0.1 percent of centered, turn green (0.1% is arbitrarily chosen)
            ctx.strokeStyle = "Green";
        } else {
            ctx.strokeStyle = "Black";
        }
        ctx.moveTo(x - 9, y);
        ctx.lineTo(x + 9, y);
        ctx.stroke();
        ctx.closePath();
    }
    ctx.beginPath();
    ctx.lineWidth = "5";
    if (Math.abs(vx) <= 0.001) {
        ctx.strokeStyle = "Green";
    } else {
        ctx.strokeStyle = "Black";
    }
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x, y + 9);
    ctx.stroke();
    ctx.closePath();

    if (Math.abs(vx) <= 0.001) {
        ctx.beginPath();
        ctx.lineWidth = "5";
        if (Math.abs(vy) < 0.01) { // within one percent of centered, turn green (1% is arbitrarily chosen)
            ctx.strokeStyle = "Green";
        } else {
            ctx.strokeStyle = "Black";
        }
        ctx.moveTo(x - 9, y);
        ctx.lineTo(x + 9, y);
        ctx.stroke();
        ctx.closePath();
    }
}
// something was entered into a box, or a setting was changed by a helper button, send data to arduino, and update checkmark indicator
async function onSettingChangeFunction(setting) {
    document.getElementById("save-settings-button-label").innerHTML = "<mark>You have unsaved changes.</mark>";
    document.getElementById("save-settings-button-label-2").innerHTML = "<mark>You have unsaved changes.</mark>  Press the Save Changes button, or your changes will be lost when the car is turned off.";
    if (document.getElementById('setting---' + setting).children[1].firstChild.type === "checkbox") {
        if (setting === "USE_SPEED_KNOB") {
            if (document.getElementById('setting---' + setting).children[1].firstChild.checked) {
                document.getElementById('setting---' + "SPEED_KNOB_SLOW_VAL").hidden = false;
                document.getElementById('setting---' + "SPEED_KNOB_FAST_VAL").hidden = false;
                document.getElementById('setting---' + "SPEED_KNOB_PIN").hidden = false;
                document.getElementById('setting---' + "SCALE_ACCEL_WITH_SPEED").hidden = false;
            } else {
                document.getElementById('setting---' + "SPEED_KNOB_SLOW_VAL").hidden = true;
                document.getElementById('setting---' + "SPEED_KNOB_FAST_VAL").hidden = true;
                document.getElementById('setting---' + "SPEED_KNOB_PIN").hidden = true;
                document.getElementById('setting---' + "SCALE_ACCEL_WITH_SPEED").hidden = true;
            }
        }
        await sendStringSerial(setting + ":" + (document.getElementById('setting---' + setting).children[1].firstChild.checked ? "1" : "0") + ",");
    } else {
        await sendStringSerial(setting + ":" + (document.getElementById('setting---' + setting).children[1].firstChild.value) + ",");
    }

    document.getElementById('setting---' + setting).children[2].hidden = true; // checkmark still hidden
    document.getElementById('setting---' + setting).children[4].hidden = true; //blank
    document.getElementById('setting---' + setting).children[3].hidden = false; // show error
}
// handle message from the Arduino where it prints current readings and values
function gotNewSettings(settings, slength) {
    document.getElementById('serial-connected-indicator').innerHTML = "connected";
    document.getElementById('serial-connected-short').innerHTML = 'connected';
    cbchk("hcbs-connect");
    cbdis("hcbs-connect");
    cblightoff("hcbs-connect");
    cbhighlight("hcbs-setting-index-title");
    document.getElementById("hcbs-setting-index").scrollIntoView({ block: "end" });

    document.getElementById("connect-to-car").style.backgroundColor = "lightgrey";

    document.getElementById('car-settings').innerHTML = "";

    document.getElementById("save-settings-button-label").innerHTML = ""; // clear "you have unsaved changes" warning since the unsaved changes were just lost since the car sent new settings
    document.getElementById("save-settings-button-label-2").innerHTML = ""; // clear "you have unsaved changes" warning since the unsaved changes were just lost since the car sent new settings

    document.getElementById('cal-con-first-look-message').hidden = true;

    var version = settings["current settings, version:"];
    var len = Object.keys(settings).length;
    if (version === 2 && len === 36 && slength === settings["CHECKSUM"]) {
        settings_received = true;
        clearInterval(serial_connected_indicator_warning_timeout);
        document.getElementById("settings-advanced-settings-info").innerHTML = "car reports version = " + version;
        var list = document.getElementById("car-settings");
        for (const setting in settings) {
            if (setting === "current settings, version:" || setting == "CHECKSUM") continue; // not a setting, skip it so it doesn't get a row in the settings table (also, I don't want people to change the print interval since setting it too low will overload the website).
            var entry = document.createElement("tr"); // each setting gets a row.
            entry.setAttribute("id", "setting---" + setting);
            entry.setAttribute("hidden", "true");
            entry.setAttribute("class", "car-setting-row");
            entry.innerHTML += '<td><span style="display: inline-block; max-width: 25vw;">' + setting.replaceAll('_', ' ').toLowerCase() + "</span></td>";

            if (Array("SCALE_ACCEL_WITH_SPEED", "REVERSE_TURN_IN_REVERSE", "USE_SPEED_KNOB").indexOf(setting) > -1) { //boolean checkbox
                entry.innerHTML += "<td>" + "<input type=checkbox" + (settings[setting] === true ? " checked" : "") + ' onchange="onSettingChangeFunction(&quot;' + setting + '&quot;)"></input></td> ';
            } else if (Array("ACCELERATION_FORWARD", "DECELERATION_FORWARD", "ACCELERATION_BACKWARD", "DECELERATION_BACKWARD", "ACCELERATION_TURNING", "DECELERATION_TURNING", "FASTEST_FORWARD", "FASTEST_BACKWARD", "TURN_SPEED", "SCALE_TURNING_WHEN_MOVING").indexOf(setting) > -1) { //float
                entry.innerHTML += '<td><input type="text" maxlength="6" size="6" inputmode="numeric" value=' + settings[setting] + ' onchange="onSettingChangeFunction(&quot;' + setting + '&quot;)" ></input></td> ';
            } else {//integer
                entry.innerHTML += '<td><input type="text" maxlength="5" size="5" inputmode="numeric" value=' + settings[setting] + ' onchange="onSettingChangeFunction(&quot;' + setting + '&quot;)" ></input></td> ';
            }

            entry.innerHTML += '<td class="setting-indicator" hidden>\u2714</td>'; // checkmark
            entry.innerHTML += ' <td class="setting-indicator" hidden onclick="onSettingChangeFunction(&quot;' + setting + '&quot;)">\u21BB</td>'; // error
            entry.innerHTML += ' <td>    </td>'; // blank space to keep the table happy (always something between the input and any helper buttons)

            var setting_helper = document.createElement("td");
            setting_helper.style.display = "inline-block";
            setting_helper.setAttribute("overflow-wrap", "anywhere");
            if (Array("CONTROL_RIGHT", "CONTROL_CENTER_X", "CONTROL_LEFT").indexOf(setting) > -1) { //joystick calibration helping
                setting_helper.innerHTML = '<button onclick="helper(&quot;joyX&quot;,&quot;' + setting + '&quot;)">set to: <span class="liveVal-joyX" style="font-family: monospace">Not receiving data, is print interval slow or off?</span></button>';
            } else if (Array("CONTROL_UP", "CONTROL_CENTER_Y", "CONTROL_DOWN").indexOf(setting) > -1) { //joystick calibration helping
                setting_helper.innerHTML = '<button onclick="helper(&quot;joyY&quot;,&quot;' + setting + '&quot;)">set to: <span class="liveVal-joyY" style="font-family: monospace">Not receiving data, is print interval slow or off?</span></button>';
            } else if (Array("JOY_X_PIN", "JOY_Y_PIN").indexOf(setting) > -1) { //joystick pin helping
                setting_helper.innerHTML = "";
                if (setting === "JOY_X_PIN") {
                    setting_helper.innerHTML += '<span> read=<span class="liveVal-joyX" style="font-family: monospace"></span> </span>'
                }
                if (setting === "JOY_Y_PIN") {
                    setting_helper.innerHTML += '<span> read=<span class="liveVal-joyY" style="font-family: monospace"></span> </span>'
                }
                for (var Ai = 0; Ai <= 5; Ai++) {
                    setting_helper.innerHTML += '<button onclick="helper(&quot;joyPin&quot;,&quot;' + setting + '&quot;,&quot;' + Ai + '&quot;)"> A' + Ai + '</button>';
                }
            } else if ("SPEED_KNOB_SLOW_VAL" === setting) {
                setting_helper.innerHTML = '<button onclick="helper(&quot;speedKnobVal&quot;,&quot;' + setting + '&quot;)">set to: <span class="liveVal-speedKnobVal" style="font-family: monospace">Not receiving data, is print interval slow or off?</span></button> analogRead value when knob is turned towards slow setting. (check SPEED_KNOB_PIN if not a clear signal)';
            } else if ("SPEED_KNOB_FAST_VAL" === setting) {
                setting_helper.innerHTML = '<button onclick="helper(&quot;speedKnobVal&quot;,&quot;' + setting + '&quot;)">set to: <span class="liveVal-speedKnobVal" style="font-family: monospace">Not receiving data, is print interval slow or off?</span></button> analogRead value when knob is turned towards fast setting. (check SPEED_KNOB_PIN if not a clear signal)';
            } else {
                setting_helper.innerHTML = presetButtonGenerator( //HARDCODED PRESETS (suggested settings to give an idea of the range)
                    setting,
                    Array("ACCELERATION_FORWARD", "DECELERATION_FORWARD", "ACCELERATION_BACKWARD", "DECELERATION_BACKWARD", "ACCELERATION_TURNING", "DECELERATION_TURNING", "FASTEST_FORWARD", "FASTEST_BACKWARD", "TURN_SPEED"),
                    Array("slow", "medium", "fast"),
                    Array(
                        Array(0.33, .75, 2), //ACCELERATION_FORWARD
                        Array(0.5, 1, 2), //DECELERATION_FORWARD
                        Array(0.25, .5, 1), //ACCELERATION_BACKWARD
                        Array(0.75, 1.5, 3), //DECELERATION_BACKWARD
                        Array(0.5, 1, 2), //ACCELERATION_TURNING
                        Array(0.75, 1.5, 3), //DECELERATION_TURNING
                        Array(0.25, 0.6, 1), //FASTEST_FORWARD
                        Array(0.2, 0.5, 0.8), //FASTEST_BACKWARD
                        Array(0.2, 0.5, 0.8)) //TURN_SPEED
                );
            }

            entry.appendChild(setting_helper);
            var helpChild = document.createElement("td");
            helpChild.innerHTML = `<h2 onclick="infoButtonHelper(&quot;` + setting + `&quot;);">&#x1F6C8</h2>`;
            entry.appendChild(helpChild);
            list.appendChild(entry);
        }

        document.getElementById("car-telem-container").style.display = "flex";

        if (speedAdjustHelp) {
            showSpeedSettings();
            document.getElementById("hcbs-setting-index-title").innerHTML = "You can customize acceleration and speed in the window to the left.";
        } else if (showEverything) {
            showAllSettings(false);
        }

    } else { // not a valid version and amount of data
        var list = document.getElementById("car-settings");
        list.innerHTML = "<mark> ERROR: The car sent invalid setting data. If disconnecting and reconnecting a couple times does not work then try reuploading the program to get the latest version. </mark>";
        document.getElementById("settings-advanced-settings-info").innerHTML = JSON.stringify(settings);

        console.log("ERROR: The car sent invalid setting data. Maybe try reuploading code? (version: " + version + ", length: " + len + ", checksum-actual: " + slength + ", checksum-reported: " + settings["CHECKSUM"] + ")");
        console.log(settings);

        document.getElementById("car-telem-container").style.display = "none";
    }

    sendStringSerial("S,"); // so that the car doesn't drive by default

    document.getElementById("configure-car").style.backgroundColor = "white";
    document.getElementById("configure-car").hidden = false;
    if (speedAdjustHelp) {
        document.getElementById("settings-header").scrollIntoView(true);
    } else {
        document.getElementById("configure-car").scrollIntoView();
    }
}

function infoButtonHelper(setting) {
    //help open button
    document.getElementById("help").hidden = false;
    document.getElementById("help-open").hidden = true;
    document.getElementById("main").style.width = "60%";
    //
    if (help_info_highlight_id != null) {
        try {
            document.getElementById("help--" + help_info_highlight_id).style.backgroundColor = "";
        } catch (e) {
            console.log(e);
        }
    }
    help_info_highlight_id = setting;

    try {
        document.getElementById("help--" + setting).style.backgroundColor = "yellow";
        document.getElementById("help--" + setting).scrollIntoView();
    } catch (e) {
        console.log(e);
    }

}

// used for giving actions to "helper" buttons to the right of the input boxes when changing car settings
function helper(type, data, data2) {
    if (type === "joyX") {
        document.getElementById('setting---' + data).children[1].firstChild.value = live_data["joyXVal"];
        onSettingChangeFunction(data)
    }
    if (type === "joyY") {
        document.getElementById('setting---' + data).children[1].firstChild.value = live_data["joyYVal"];
        onSettingChangeFunction(data)
    }
    if (type === "speedKnobVal") {
        document.getElementById('setting---' + data).children[1].firstChild.value = live_data["speedKnobVal"];
        onSettingChangeFunction(data)
    }
    if (type === "joyPin") {
        document.getElementById('setting---' + data).children[1].firstChild.value = 14 + parseInt(data2); // helper buttons for Analog inputs
        onSettingChangeFunction(data)
    }
    if (type === "presetSettingChange") { //sets setting with name of data to value of data2
        document.getElementById('setting---' + data).children[1].firstChild.value = data2;
        onSettingChangeFunction(data)
    }
}
// generates row of buttons that change settings to preset values
function presetButtonGenerator(setting, settings, labels, values) {
    if (settings.indexOf(setting) === -1) {
        return ""; // not a settings that gets presets
    }
    let index = settings.indexOf(setting);
    let html = "";
    for (let i = 0; i < values[index].length; i++) {
        html += `<button onclick="helper(&quot;presetSettingChange&quot;,&quot;` + setting + `&quot;,` + values[index][i] + `)">` + labels[i] + `</button>`;
    }
    return html;
}

////functions (called by buttons) for showing and hiding parts of the settings table to make the website look simpler
function showPinSettings() {
    cancelFollowTheDot();
    var elements = document.getElementsByClassName("car-setting-row");
    for (var i = 0; i < elements.length; i++) {
        if (Array(
            "setting---JOY_X_PIN",
            "setting---JOY_Y_PIN",
            "setting---LEFT_MOTOR_CONTROLLER_PIN",
            "setting---RIGHT_MOTOR_CONTROLLER_PIN"
        ).indexOf(elements[i].id) > -1) { //joystick calibration helping
            elements[i].hidden = false;
        } else {
            elements[i].hidden = true;
        }
    }
    document.getElementById("save-settings-button").scrollIntoView();

}
function showJoystickSettings() {
    var elements = document.getElementsByClassName("car-setting-row");
    for (var i = 0; i < elements.length; i++) {
        if (Array(
            "setting---CONTROL_RIGHT",
            "setting---CONTROL_CENTER_X",
            "setting---CONTROL_LEFT",
            "setting---CONTROL_UP",
            "setting---CONTROL_CENTER_Y",
            "setting---CONTROL_DOWN",
        ).indexOf(elements[i].id) > -1) { //joystick calibration helping
            elements[i].hidden = false;
        } else {
            elements[i].hidden = true;
        }
    }
    document.getElementById("save-settings-button").scrollIntoView();

}
async function swapxandypins() {
    let tempX = document.getElementById('setting---JOY_X_PIN').children[1].firstChild.value;
    document.getElementById('setting---JOY_X_PIN').children[1].firstChild.value = document.getElementById('setting---JOY_Y_PIN').children[1].firstChild.value;
    document.getElementById('setting---JOY_Y_PIN').children[1].firstChild.value = tempX;
    await onSettingChangeFunction("JOY_X_PIN");
    await onSettingChangeFunction("JOY_Y_PIN");
}
function showSpeedSettings() {
    cancelFollowTheDot();
    var elements = document.getElementsByClassName("car-setting-row");
    for (var i = 0; i < elements.length; i++) {
        if (Array(
            "setting---ACCELERATION_FORWARD"
            , "setting---DECELERATION_FORWARD"
            , "setting---ACCELERATION_BACKWARD"
            , "setting---DECELERATION_BACKWARD"
            , "setting---ACCELERATION_TURNING"
            , "setting---DECELERATION_TURNING"
            , "setting---FASTEST_FORWARD"
            , "setting---FASTEST_BACKWARD"
            , "setting---TURN_SPEED"
            , "setting---SCALE_TURNING_WHEN_MOVING"
            , "setting---REVERSE_TURN_IN_REVERSE"
        ).indexOf(elements[i].id) > -1) { //joystick calibration helping
            elements[i].hidden = false;
        } else {
            elements[i].hidden = true;
        }
    }
    document.getElementById("settings-header").scrollIntoView();

}
function showAllSettings(scroll) {
    cancelFollowTheDot();
    var elements = document.getElementsByClassName("car-setting-row");
    for (var i = 0; i < elements.length; i++) {
        elements[i].hidden = false;
    }
    try {
        if (document.getElementById('setting---' + "USE_SPEED_KNOB").children[1].firstChild.checked) {
            document.getElementById('setting---' + "SPEED_KNOB_SLOW_VAL").hidden = false;
            document.getElementById('setting---' + "SPEED_KNOB_FAST_VAL").hidden = false;
            document.getElementById('setting---' + "SPEED_KNOB_PIN").hidden = false;
            document.getElementById('setting---' + "SCALE_ACCEL_WITH_SPEED").hidden = false;
        } else {
            document.getElementById('setting---' + "SPEED_KNOB_SLOW_VAL").hidden = true;
            document.getElementById('setting---' + "SPEED_KNOB_FAST_VAL").hidden = true;
            document.getElementById('setting---' + "SPEED_KNOB_PIN").hidden = true;
            document.getElementById('setting---' + "SCALE_ACCEL_WITH_SPEED").hidden = true;
        }
    } catch (e) {
        // sometimes the checkbox hasn't loaded when this function is called, but showAllSettings is called again when settings are received.
    }

    if (scroll) {
        document.getElementById("save-settings-button").scrollIntoView();
    }
}

// the car replied with a "result" as a response to being told to change a setting
function gotNewResult(result) {
    if (result["result"] === "change") {
        document.getElementById('setting---' + result["setting"]).children[3].hidden = true; // hide error
        document.getElementById('setting---' + result["setting"]).children[4].hidden = true; // hide blank
        document.getElementById('setting---' + result["setting"]).children[2].hidden = false; // show checkmark
        document.getElementById('setting---' + result["setting"]).children[1].firstChild.value = result["value"]; // change input to what the Arduino says it received
    }
    if (result["result"] === "saved") { // saved settings to EEPROM
        var elements = document.getElementsByClassName("car-setting-row");
        for (var i = 0; i < elements.length; i++) {
            elements[i].children[3].hidden = true; // hide error
            elements[i].children[2].hidden = true; // hide checkmark    
            elements[i].children[4].hidden = false; // show blank
        }
        document.getElementById('save-settings-button-label').innerHTML = "Saved!";
        document.getElementById('save-settings-button-label-2').innerHTML = "Saved!";
    }
}

async function updateUpload() {
    var checkBox = document.getElementById("upload-main-checkbox");
    configurations_info = await getConfigInfo(checkBox.checked);

    if (configurations_info == null) {
        document.getElementById("no-config-alert").innerHTML = "The list of programs available to upload can not be found. Please check your internet connection, try again in 10 minutes, then please contact us if the problem continues.";
        document.getElementById("upload-controls-div").hidden = true;

        document.getElementById("source-name-display").innerHTML = "Error: configurations info is null!";

    } else { //there are options for programs to upload

        configurations_info = configurations_info.split("\n");
        document.getElementById("no-config-alert").innerHTML = "";
        document.getElementById("upload-controls-div").hidden = false;

        options = configurations_info.slice(2, -1); //get just the rows with data for an option
        //split rows and make 2d array
        for (var i = 0; i < options.length; i++) {
            options[i] = options[i].split(", ");
        }

        updateProgramOptionsSelector();

    }
}

async function getCode() {
    var program_selector = document.getElementById("program-selector");
    var program = program_selector.options[program_selector.selectedIndex].value;
    var board_selector = document.getElementById("board-selector");
    var board = board_selector.options[board_selector.selectedIndex].value;
    var name = options.filter((v) => { return v[1] === program && v[2] === board })[0][0];
    var code = null;
    try {
        if (configurations_info[0] === "release") {
            code = await getRequest("https://raw.githubusercontent.com/gobabygocarswithjoysticks/car-code/" + configurations_info[1] + "/hex/" + name + "/" + program + ".ino.hex");
        } else {
            code = await getRequest("https://raw.githubusercontent.com/gobabygocarswithjoysticks/car-code/" + configurations_info[1] + "/hex/" + name + "/" + program + ".ino.hex");
        }
    } catch (e) { }

    var upload_warning_span = document.getElementById("upload-warning-span");
    var upload_button = document.getElementById("upload-button");

    if (code == null) {
        upload_warning_span.innerHTML = "<mark>The code for the car can not be found. Please check your internet connection, try again in 10 minutes, then please contact us if the problem continues.</mark>";
        upload_button.hidden = true;
    } else { // code received! 
        upload_warning_span.innerHTML = "";
        var upload_progress_span = document.getElementById("upload-progress");
        upload_progress_span.innerHTML = "Ready";
        upload_button.hidden = false;
        /* 
        I edited arduino-web-uploader so hex-href should be the actual hex code instead of a url where it can be downloaded. 
        This way the hex code can be downloaded by this script instead of by the uploader code where I wouldn't have control of it. 
        The code is stored inside the html of the page.
        */
        upload_button.setAttribute("hex-href", code);
        upload_button.setAttribute("board", board);
    }


    if (configurations_info[0] === "release") {
        codeURLForHumans = "https://github.com/gobabygocarswithjoysticks/car-code/tree/" + configurations_info[1] + "/" + program;
    } else {
        codeURLForHumans = "https://github.com/gobabygocarswithjoysticks/car-code/tree/" + configurations_info[1] + "/" + program;
    }
    document.getElementById("source-name-display").innerHTML = 'source: <a target="_blank" rel="noopener noreferrer" href= "' + codeURLForHumans + '">' + codeURLForHumans + '</a>';

}
function updateBoardOptionsSelector() {
    var program_selector = document.getElementById("program-selector");
    var selected_program = program_selector.options[program_selector.selectedIndex].text;
    var board_options = options.filter((v) => { return v[1] === selected_program });
    board_options_nice_names = [... new Set(extractColumn(board_options, 3))];
    board_options = [... new Set(extractColumn(board_options, 2))];

    var select = document.getElementById("board-selector");

    if (board_options == null) {
        while (select.firstChild) { //empty selector
            select.removeChild(select.firstChild);
        }
    } else {
        while (select.firstChild) { //empty selector before filling it
            select.removeChild(select.firstChild);
        }
        // https://www.geeksforgeeks.org/how-to-create-a-dropdown-list-with-array-values-using-javascript/
        for (var i = 0; i < board_options.length; i++) {
            var optn = board_options[i];
            var optn_name = board_options_nice_names[i];
            var el = document.createElement("option");
            el.textContent = optn_name;
            el.value = optn;
            select.appendChild(el);
        }
    }
    getCode();
}
function updateProgramOptionsSelector() {
    //uses https://stackoverflow.com/a/42123984 to find unique values
    var program_options = [... new Set(extractColumn(options, 1))];

    var select = document.getElementById("program-selector");

    if (program_options == null) {
        while (select.firstChild) { //empty selector
            select.removeChild(select.firstChild);
        }
    } else {
        while (select.firstChild) { //empty selector before filling it
            select.removeChild(select.firstChild);
        }
        // https://www.geeksforgeeks.org/how-to-create-a-dropdown-list-with-array-values-using-javascript/
        for (var i = 0; i < program_options.length; i++) {
            var optn = program_options[i];
            var el = document.createElement("option");
            el.textContent = optn;
            el.value = optn;
            select.appendChild(el);
        }
    }
    updateBoardOptionsSelector(options);
}

function extractColumn(arr, column) {
    //https://gist.github.com/eddieajau/5f3e289967de60cf7bf9?permalink_comment_id=2727196#gistcomment-2727196
    return arr.map(x => x[column])
}

/**
 * Gets configurations-info.txt from github, and returns it as a string.
 * returns null if there is an error
 * if fromMain is true, it pulls the data from the main branch, if false it pulls the data from the most recent release
 */
async function getConfigInfo(fromMain) {
    if (fromMain === true) {
        try {
            result = await getRequest("https://raw.githubusercontent.com/gobabygocarswithjoysticks/car-code/main/hex/configurations-info.txt");
            return "unreleased\n" + "main" + "\n" + result;
        } catch (e) {
            return null;
        }

    } else {
        try {
            var json = JSON.parse(await getRequest("https://api.github.com/repos/gobabygocarswithjoysticks/car-code/releases"));
            var most_recent_release_tag = json[0].tag_name;

            var configUrl = "https://raw.githubusercontent.com/gobabygocarswithjoysticks/car-code/" + most_recent_release_tag + "/hex/configurations-info.txt";
            return "release\n" + most_recent_release_tag + "\n" + await getRequest(configUrl);
        } catch (e) {
            return null;
        }
    }
};
/**
 * code for getting data from a url, returns response.text if the request succeeds, and throws an error if there is an error status.
 */
async function getRequest(url) {
    await fetch(url)
        .then((response) => {
            if (response.status == 200) {
                return response.text();
            } else {
                throw new Error(`HTTP error in getRequest() Status: ${response.status} `);
            }
        })
        .then((responseText) => {
            result = responseText;
        });
    return result;
}
// checks, locks, and unhighlights current checkbox
// if a second id is provided, it is unlocked and highlighted
function cbdone(id, next) {
    cbchk(id);
    cbdis(id);

    cblightoff(id);

    if (next) {
        cben(next);

        cbhighlight(next);

        document.getElementById(next).scrollIntoView({ block: "end" });
    }
}
function cbhighlight(next) {
    document.getElementById(next).style.outline = "4px solid magenta";
}
function cblightoff(next) {
    document.getElementById(next).style.outline = "0px";
}
function cbchk(id) {
    document.getElementById(id).checked = true;

}
function cbdis(id) {
    document.getElementById(id).disabled = true;
}

function cben(id) {
    document.getElementById(id).disabled = false;
}
