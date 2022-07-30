document.addEventListener('DOMContentLoaded', async function () {
    // runs on startup
    // check if web serial is enabled
    if (!("serial" in navigator)) {
        document.getElementById("serial-alert").innerHTML = "Web Serial is not available, so this site won't be able to communicate with your car. Please use Google Chrome, Opera, or Edge, and make sure Web Serial is enabled.";
    }

    updateUpload();
});

async function updateUpload() {
    var checkBox = document.getElementById("upload-main-checkbox");
    var configurations_info = await getConfigInfo(checkBox.checked);

    if (configurations_info == null) {
        document.getElementById("program-selector-alert").innerHTML = "The list of programs available to upload can not be retrieved. Please check your internet connection, try again in 10 minutes and if the problem persists please contact us.";

        updateProgramOptionsSelector(null);
        document.getElementById("source-name-display").innerHTML = "";

    } else { //there are options for programs to upload
        document.getElementById("program-selector-alert").innerHTML = "";

        var optionsRows = configurations_info.split("\n").slice(2, -1); //get just the rows with data for an option
        //split rows and make 2d array
        for (var i = 0; i < optionsRows.length; i++) {
            optionsRows[i] = optionsRows[i].split(",");
        }


        //uses https://stackoverflow.com/a/42123984 to find unique values
        var program_options = [... new Set(extractColumn(optionsRows, 1))];

        updateProgramOptionsSelector(program_options);
        document.getElementById("source-name-display").innerHTML = "source: " + configurations_info.split("\n").slice(1, 2);
    }
}

function updateProgramOptionsSelector(program_options) {
    var select = document.getElementById("program-selector");

    if (program_options == null) {
        select.hidden = true;
    } else {
        select.hidden = false;
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
            console.log(result);
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