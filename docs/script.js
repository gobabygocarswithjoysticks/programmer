var configurations_info = null; // the configuration file pulled from https://github.com/gobabygocarswithjoysticks/car-code/blob/main/hex/configurations-info.txt which has info about what programs are available to upload
var options = null; // configurations_info, but just the lines with program info
var port = null; // serial port for connection to car
var reader = null; // reads from the serial port
var serial_connected_indicator_warning_timeout; // the result of a setInterval() used to display a warning message if the car is taking a long time to send a valid message
var serialConnectionRunning = false; // boolean, is a car connected?
var sendStringSerialLock = false; // boolean, prevents sendStringSerial from being used more than once at a time (sendStringSerial just exits without sending a message if a message is in the process of being sent.
var live_data = null; // the live data that the car reports (Json) (used for joystick calibration and other displays)
var showEverything = false; //if the "show all the options at once button is pressed, all the settings will also be shown when they load
document.addEventListener('DOMContentLoaded', async function () {
    // runs on startup
    // check if web serial is enabled
    if (!("serial" in navigator)) {
        document.getElementById("serial-alert").innerHTML = "Web Serial is not available, so this site won't be able to communicate with your car. Please use Google Chrome, Opera, or Edge, and make sure Web Serial is enabled.";
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
            document.getElementById("upload-connect-comment").hidden = true;
            document.getElementById("upload-program").style.backgroundColor = "lightgrey";
            document.getElementById("connect-to-car").style.backgroundColor = "white";
            document.getElementById("connect-to-car").hidden = false;
            document.getElementById("connect-to-car").scrollIntoView();
            document.getElementById("post-upload-connect-message").hidden = false;
        }
        if (mutationRecords[0].addedNodes[0].data === "0%") {
            document.getElementById("upload-program").style.backgroundColor = "white";
            document.getElementById("connect-to-car").style.backgroundColor = "lightgrey";
        }

    });
    observer.observe(document.getElementById("upload-progress"), {
        childList: true
    });


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

    document.getElementById("connect-to-car").scrollIntoView();
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
    document.getElementById('serial-connected-indicator').innerHTML = "";
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

    document.getElementById("serial-connect-button").hidden = true;
    document.getElementById("serial-disconnect-button").hidden = false;


    try {
        port = await navigator.serial.requestPort();
        serial_connected_indicator_warning_timeout = setTimeout(() => { document.getElementById('serial-connected-indicator').innerHTML = "trying to connect... It's taking a long time, try disconnecting and checking the port, and try closing other tabs or Arduino windows that might be connected to the car."; }, 3000);
        await port.open({ baudRate: 115200 });
    } catch (e) { // port selection canceled
        serialConnectionRunning = false;
        clearInterval(serial_connected_indicator_warning_timeout);
        document.getElementById('serial-connected-indicator').innerHTML = "did not connect. If you didn't cancel the connection, try closing other tabs or Arduino windows that might be connected to the car.";

        document.getElementById("serial-connect-button").hidden = false;
        document.getElementById("serial-disconnect-button").hidden = true;

        document.getElementById("configure-car").style.backgroundColor = "lightgrey";
        document.getElementById("connect-to-car").style.backgroundColor = "white";

        document.getElementById('telemetry-loading-message').hidden = true;

        return;
    }

    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    let string = "";

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
                try {
                    string = string.substring(
                        string.indexOf("{"),
                        string.indexOf("}") + 1
                    );
                    json = JSON.parse(string);
                } catch (e) {
                    // had an error with parsing the data
                    string = "";
                }
                if (json != null) gotNewSerial(json);
                string = "";
            }
        }
    } catch (e) {
        // this happens if the arduino is unplugged from the computer
        console.log(e);
        serialConnectionRunning = false;
        document.getElementById('serial-connected-indicator').innerHTML = "DISCONNECTED!";

        document.getElementById("serial-connect-button").hidden = false;
        document.getElementById("serial-disconnect-button").hidden = true;

        document.getElementById("configure-car").style.backgroundColor = "lightgrey";
        document.getElementById("connect-to-car").style.backgroundColor = "white";

        document.getElementById('telemetry-loading-message').hidden = true;

        document.getElementById("connect-to-car").scrollIntoView();

    }

    await readableStreamClosed.catch(() => { /* Ignore the error */ });

    await port.close();
    serialConnectionRunning = false;
    if (document.getElementById('serial-connected-indicator').innerHTML != "DISCONNECTED!") {
        document.getElementById('serial-connected-indicator').innerHTML = "";
    }
}
// data is the data just received from the Arduino, in JSON form. Handle all the types of messages here:
function gotNewSerial(data) {
    if (data["current values, millis:"] != null) {
        gotNewData(data);
    } else if (data["current settings, version:"] != null) {
        gotNewSettings(data);
    } else if (data["result"] != null) {
        gotNewResult(data);
    } else {
        console.log("unexpected message: ");
        console.log(data);
        // not an expected message
    }
}
// handle the message from the Arduino where it prints current readings and values.
function gotNewData(data) {
    live_data = data;
    // console.log(data);
    document.getElementById('telemetry-loading-message').hidden = true;

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

    drawJoystickCanvas("joystick-input-canvas", data["turnInput"], data["speedInput"]);
    drawJoystickCanvas("scaled-input-canvas", data["turnProcessed"], data["speedProcessed"]);
    drawJoystickCanvas("smoothed-input-canvas", data["turnToDrive"], data["speedToDrive"]);

    drawMotorSignal(true, "motor-signal-canvas", 60, data, "left");
    drawMotorSignal(false, "motor-signal-canvas", 120, data, "right");

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
            ctx.strokeStyle = "MediumBlue";
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
        ctx.strokeStyle = "MediumBlue";
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
            ctx.strokeStyle = "MediumBlue";
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
    document.getElementById("save-settings-button-label-2").innerHTML = "<mark>You have unsaved changes.</mark>  Press the Save Changes button above, or your changes will be lost when the car is turned off.";
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
function gotNewSettings(settings) {
    clearInterval(serial_connected_indicator_warning_timeout);
    document.getElementById('serial-connected-indicator').innerHTML = "connected";
    document.getElementById("post-upload-connect-message").hidden = true;

    document.getElementById('telemetry-loading-message').hidden = false;

    document.getElementById("connect-to-car").style.backgroundColor = "lightgrey";

    document.getElementById('car-settings').innerHTML = "";

    document.getElementById("save-settings-button-label").innerHTML = ""; // clear "you have unsaved changes" warning since the unsaved changes were just lost since the car sent new settings
    document.getElementById("save-settings-button-label-2").innerHTML = ""; // clear "you have unsaved changes" warning since the unsaved changes were just lost since the car sent new settings

    document.getElementById('cal-con-first-look-message').hidden = true;

    var version = settings["current settings, version:"];
    var len = Object.keys(settings).length;
    if (version === 1 && len === 36) {
        document.getElementById("settings-advanced-settings-info").innerHTML = "car reports version = " + version;
        var list = document.getElementById("car-settings");
        for (const setting in settings) {
            if (setting === "current settings, version:") continue; // not a setting, skip it so it doesn't get a row in the settings table
            var entry = document.createElement("tr"); // each setting gets a row.
            entry.setAttribute("id", "setting---" + setting);
            entry.setAttribute("hidden", "true");
            entry.setAttribute("class", "car-setting-row");
            entry.innerHTML += "<td>" + setting + "</td>";

            if (Array("SCALE_ACCEL_WITH_SPEED", "REVERSE_TURN_IN_REVERSE", "USE_SPEED_KNOB").indexOf(setting) > -1) { //boolean checkbox
                entry.innerHTML += "<td>" + "<input type=checkbox" + (settings[setting] === true ? " checked" : "") + ' onchange="onSettingChangeFunction(&quot;' + setting + '&quot;)"></input></td> ';
            } else if (Array("ACCELERATION_FORWARD", "DECELERATION_FORWARD", "ACCELERATION_BACKWARD", "DECELERATION_BACKWARD", "ACCELERATION_TURNING", "DECELERATION_TURNING", "FASTEST_FORWARD", "FASTEST_BACKWARD", "TURN_SPEED", "SCALE_TURNING_WHEN_MOVING").indexOf(setting) > -1) { //float
                entry.innerHTML += '<td><input type="text" inputmode="numeric" value=' + settings[setting] + ' onchange="onSettingChangeFunction(&quot;' + setting + '&quot;)" ></input></td> ';
            } else {//integer
                entry.innerHTML += '<td><input type="text" inputmode="numeric" value=' + settings[setting] + ' onchange="onSettingChangeFunction(&quot;' + setting + '&quot;)" ></input></td> ';
            }

            entry.innerHTML += '<td class="setting-indicator" hidden>\u2714</td>'; // checkmark
            entry.innerHTML += ' <td class="setting-indicator" hidden onclick="onSettingChangeFunction(&quot;' + setting + '&quot;)">\u21BB</td>'; // error
            entry.innerHTML += ' <td>    </td>'; // blank space to keep the table happy (always something between the input and any helper buttons)

            var setting_helper = document.createElement("span");
            if (Array("CONTROL_RIGHT", "CONTROL_CENTER_X", "CONTROL_LEFT").indexOf(setting) > -1) { //joystick calibration helping
                setting_helper.innerHTML = '<button onclick="helper(&quot;joyX&quot;,&quot;' + setting + '&quot;)">set to: <span class="liveVal-joyX" style="font-family: monospace">Not receiving data, is print interval slow or off?</span></button> (check JOY_X_PIN if not a clear signal)';
            } else if (Array("CONTROL_UP", "CONTROL_CENTER_Y", "CONTROL_DOWN").indexOf(setting) > -1) { //joystick calibration helping
                setting_helper.innerHTML = '<button onclick="helper(&quot;joyY&quot;,&quot;' + setting + '&quot;)">set to: <span class="liveVal-joyY" style="font-family: monospace">Not receiving data, is print interval slow or off?</span></button> (check JOY_Y_PIN if not a clear signal)';
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
            } else if ("SCALE_TURNING_WHEN_MOVING" === setting) {
                setting_helper.innerHTML = "<span>This setting changes how tightly the car turns when the joystick is pushed to a corner, try 0.5 to start.</span>";
            } else if ("SCALE_ACCEL_WITH_SPEED" === setting) {
                setting_helper.innerHTML = "<span> Check box if using a speed knob and you want to keep time to max speed constant instead of acceleration being constant If checked: (1/accel)=time to reach max speed setting. If unchecked: (1/accel)=time to reach speed of 1.0.</span>";
            } else if ("REVERSE_TURN_IN_REVERSE" === setting) {
                setting_helper.innerHTML = "<span>Changes how the car drives in reverse. If checked: car drives towards direction joystick pointed. If unchecked: car spins in direction joystick pointed.</span>";
            } else if (Array("X_DEADZONE", "Y_DEADZONE").indexOf(setting) > -1) {
                setting_helper.innerHTML = "<span>How big of a zone near the center of an axis should movement be ignored in? Try around 10 to start with.</span>";
            } else if (Array("LEFT_MOTOR_SLOW", "RIGHT_MOTOR_SLOW").indexOf(setting) > -1) {
                setting_helper.innerHTML = "<span>Center \u00B1 what makes the motor start to turn? Can be negative if the motor is wired backwards. try 25</span>";
            } else if (Array("LEFT_MOTOR_FAST", "RIGHT_MOTOR_FAST").indexOf(setting) > -1) {
                setting_helper.innerHTML = "<span>Center \u00B1 what makes the motor run at full speed? Can be negative if the motor is wired backwards. try 500</span>";
            } else if (Array("LEFT_MOTOR_CENTER", "RIGHT_MOTOR_CENTER").indexOf(setting) > -1) {
                setting_helper.innerHTML = "<span>what ESC signal makes the motor stop? usually 1500</span>";
            } else if ("USE_SPEED_KNOB" === setting) {
                setting_helper.innerHTML = "<span>Has an optional knob for reducing max speed been added?</span>";
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
                        Array(0.4, 0.6, 1), //FASTEST_FORWARD
                        Array(0.3, 0.5, 0.8), //FASTEST_BACKWARD
                        Array(0.3, 0.5, 0.8)) //TURN_SPEED
                );
            }

            entry.appendChild(setting_helper);
            list.appendChild(entry);
        }

        if (showEverything) {
            showAllSettings(false);
        }

    } else { // not a valid version and amount of data
        var list = document.getElementById("car-settings");
        list.innerHTML = "<mark> ERROR: The car sent invalid setting data. Maybe try reuploading code to get the latest version? </mark>";
        document.getElementById("settings-advanced-settings-info").innerHTML = JSON.stringify(settings);

        console.log("ERROR: The car sent invalid setting data. Maybe try reuploading code? (version: " + version + ", length: " + len + ")");
        console.log(settings);

    }

    document.getElementById("configure-car").style.backgroundColor = "white";
    document.getElementById("configure-car").hidden = false;
    document.getElementById("configure-car").scrollIntoView();
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
    document.getElementById("config-help-paragraph").innerHTML = "you can look at the wiring in the car to see what pins are used";
    document.getElementById("configure-car").scrollIntoView();

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
    document.getElementById("config-help-paragraph").innerHTML = 'Move the joystick to the position of each setting and press the corresponding button that says "set to." <br> <button onclick="swapxandypins()">swap x and y (pins)</button>';
    document.getElementById("configure-car").scrollIntoView();

}
async function swapxandypins() {
    let tempX = document.getElementById('setting---JOY_X_PIN').children[1].firstChild.value;
    document.getElementById('setting---JOY_X_PIN').children[1].firstChild.value = document.getElementById('setting---JOY_Y_PIN').children[1].firstChild.value;
    document.getElementById('setting---JOY_Y_PIN').children[1].firstChild.value = tempX;
    await onSettingChangeFunction("JOY_X_PIN");
    await onSettingChangeFunction("JOY_Y_PIN");
}
function showSpeedSettings() {
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
    document.getElementById("config-help-paragraph").innerHTML = "change speed and acceleration of the car";
    document.getElementById("configure-car").scrollIntoView();

}
function showAllSettings(scroll) {
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
    document.getElementById("config-help-paragraph").innerHTML = "";
    if (scroll) {
        document.getElementById("configure-car").scrollIntoView();
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
        document.getElementById('save-settings-button-label-2').innerHTML = "";
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
    var program = program_selector.options[program_selector.selectedIndex].text;
    var board_selector = document.getElementById("board-selector");
    var board = board_selector.options[board_selector.selectedIndex].text;
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
            var el = document.createElement("option");
            el.textContent = optn;
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