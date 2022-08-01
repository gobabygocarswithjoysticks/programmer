var options = null;
var configurations_info = null;
var port = null;
document.addEventListener('DOMContentLoaded', async function () {
    // runs on startup
    // check if web serial is enabled
    if (!("serial" in navigator)) {
        document.getElementById("serial-alert").innerHTML = "Web Serial is not available, so this site won't be able to communicate with your car. Please use Google Chrome, Opera, or Edge, and make sure Web Serial is enabled.";
    }

    updateUpload();
});

async function connectToSerial() {
    if (port != null) await port.close();
    port = await navigator.serial.requestPort();
    // Wait for the serial port to open.
    await port.open({ baudRate: 115200 });

    //https://makeabilitylab.github.io/physcomp/communication/web-serial.html#requesting-permission-to-communicate-with-a-serial-device
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();

    let string = "";
    // Listen to data coming from the serial device.

    while (true) {
        const { value, done } = await reader.read();
        if (done) {
            // Allow the serial port to be closed later.
            reader.releaseLock();
            console.log("########################################################33");
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
                json = JSON.parse(string);
            } catch (e) {
                string = "";
                // had an error with parsing the data
                console.log("error parsing json");
            }
            if (json != null) gotNewSerial(json);
            string = "";
        }
    }
}

function gotNewSerial(data) {
    if (data["current values, millis:"] != null) {
        gotNewData(data);
    } else if (data["current settings, version:"] != null) {
        gotNewSettings(data);
    } else if (data["result"] != null) {
        gotNewResult(data["result"] === "success");
    } else {
        // not an expected message
    }
}
function gotNewData(data) {
    console.log(data);

}
function gotNewSettings(settings) {
    console.log(settings);
}
function gotNewResult(success) {
    console.log(success);
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
function uploadErrorCallback() {
    console.out("$#$%!#$%!#$% error uploading");
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