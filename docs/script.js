var options = null;
var configurations_info = null;
var port = null;
var reader = null;
var serialConnectionRunning = false;
var car_settings = null;
document.addEventListener('DOMContentLoaded', async function () {
    // runs on startup
    // check if web serial is enabled
    if (!("serial" in navigator)) {
        document.getElementById("serial-alert").innerHTML = "Web Serial is not available, so this site won't be able to communicate with your car. Please use Google Chrome, Opera, or Edge, and make sure Web Serial is enabled.";
    }
    document.getElementById("serial-disconnect-button").hidden = true;

    updateUpload();
    document.getElementById("upload-program").hidden = true;
    document.getElementById("connect-to-car").hidden = true;
    document.getElementById("configure-car").hidden = true;

    document.getElementById("upload-program").style.backgroundColor = "lightgrey";
    document.getElementById("connect-to-car").style.backgroundColor = "lightgrey";
    document.getElementById("configure-car").style.backgroundColor = "lightgrey";


    // watch the upload-progress span to get information about the program upload progress
    const observer = new MutationObserver(mutationRecords => {
        console.log(mutationRecords); // console.log(the changes)
        console.log(mutationRecords[0].addedNodes[0].data);
        if (mutationRecords[0].addedNodes[0].data === "Done!") {
            document.getElementById("upload-program").style.backgroundColor = "lightgrey";
            document.getElementById("connect-to-car").style.backgroundColor = "white";
            document.getElementById("connect-to-car").hidden = false;
        }
    });

    observer.observe(document.getElementById("upload-progress"), {
        childList: true
    });


});
function showFirstTime() {
    // displayMode="showFirstTime";
    document.getElementById("upload-program").style.backgroundColor = "white";
    document.getElementById("upload-program").hidden = false;

    document.getElementById("connect-to-car").hidden = true;
    document.getElementById("upload-program").style.backgroundColor = "lightgrey";

    document.getElementById("configure-car").hidden = true;
    document.getElementById("upload-program").style.backgroundColor = "lightgrey";
}
function showConfigButton() {
    // displayMode="showConfigButton";
    document.getElementById("upload-program").hidden = true;
    document.getElementById("upload-program").style.backgroundColor = "lightgrey";

    document.getElementById("connect-to-car").style.backgroundColor = "white";
    document.getElementById("connect-to-car").hidden = false;

    document.getElementById("configure-car").hidden = true;
    document.getElementById("configure-car").style.backgroundColor = "lightgrey";
}
function showEverythingButton() {
    // displayMode="showEverything";
    document.getElementById("upload-program").style.backgroundColor = "white";
    document.getElementById("connect-to-car").style.backgroundColor = "white";
    document.getElementById("configure-car").style.backgroundColor = "white";

    document.getElementById("upload-program").hidden = false;
    document.getElementById("connect-to-car").hidden = false;
    document.getElementById("configure-car").hidden = false;
}
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

}

async function sendStringSerial(string) {
    if (!serialConnectionRunning) return;
    const writer = port.writable.getWriter();
    try {
        var enc = new TextEncoder(); // always utf-8
        await writer.write(enc.encode(string));
    } catch (e) {

    } finally {
        writer.releaseLock();
    }
}

async function connectToSerial() {
    if (serialConnectionRunning) return;
    serialConnectionRunning = true;
    document.getElementById('serial-connected-indicator').innerHTML = "trying to connect...";

    document.getElementById("serial-connect-button").hidden = true;
    document.getElementById("serial-disconnect-button").hidden = false;

    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });
    } catch (e) { // port selection canceled
        serialConnectionRunning = false;
        document.getElementById('serial-connected-indicator').innerHTML = "";

        document.getElementById("serial-connect-button").hidden = false;
        document.getElementById("serial-disconnect-button").hidden = true;
        return;
    }

    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    let string = "";

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                reader.releaseLock();
                break;
            }
            // value is a string.
            string += value;
            if (string.length > 10000) { // avoid the string getting extremely long if no terminating character is being sent
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

    }

    // const textEncoder = new TextEncoderStream();
    // const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);

    await readableStreamClosed.catch(() => { /* Ignore the error */ });

    // writer.close();
    // await writableStreamClosed;

    await port.close();
    serialConnectionRunning = false;
    if (document.getElementById('serial-connected-indicator').innerHTML != "DISCONNECTED!") {
        document.getElementById('serial-connected-indicator').innerHTML = "";
    }

}

function gotNewSerial(data) {
    if (data["current values, millis:"] != null) {
        gotNewData(data);
    } else if (data["current settings, version:"] != null) {
        gotNewSettings(data);
    } else if (data["result"] != null) {
        gotNewResult(data);
    } else {
        // not an expected message
    }
}
function gotNewData(data) {
    console.log(data);

}
function gotNewSettings(settings) {
    car_settings = settings;
    document.getElementById('serial-connected-indicator').innerHTML = "connected";

    document.getElementById('car-settings').innerHTML = "";
    var version = settings["current settings, version:"];
    var len = Object.keys(settings).length;
    if (version === 1) {
        if (len === 36) { // correct data
            var list = document.getElementById("car-settings");
            for (const setting in settings) {
                if (setting === "current settings, version:") continue;
                var entry = document.createElement("tr");
                entry.innerHTML += "<td>" + setting + "</td>";
                entry.innerHTML += "<td>" + settings[setting] + "</td>";

                list.appendChild(entry);
            }
        }
    }
}
function gotNewResult(success) {
    console.log(success["result"] === "success");
    console.log(success["result"] === "saved");
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
                throw new Error(`HTTP error in getRequest() Status: ${response.status}`);
            }
        })
        .then((responseText) => {
            result = responseText;
        });
    return result;
}