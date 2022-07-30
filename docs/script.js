var configurations_info = null;

document.addEventListener('DOMContentLoaded', function () {
    // runs on startup
    //check if web serial is enabled
    if (!("serial" in navigator)) {
        document.getElementById("serial-alert").innerHTML = "Web Serial is not available, so this site won't be able to communicate with your car. Please use Google Chrome, Opera, or Edge, and make sure Web Serial is enabled.";
    }

    getConfigInfo(true);

});

function getConfigInfo(fromMain) {
    if (fromMain) {
        var configUrl = "https://raw.githubusercontent.com/gobabygocarswithjoysticks/car-code/main/hex/configurations-info.txt";
        var configxhr = new XMLHttpRequest();
        configxhr.open("GET", configUrl);
        configxhr.onreadystatechange = function () {
            if (configxhr.readyState === 4 && configxhr.status === 200) {
                configurations_info = "unreleased\n" + "main" + "\n" + configxhr.responseText;
                console.log(configurations_info);
            }
        };
        configxhr.send();
    } else {
        var releaseInfoUrl = "https://api.github.com/repos/gobabygocarswithjoysticks/car-code/releases";
        var releaseInfoxhr = new XMLHttpRequest();
        releaseInfoxhr.open("GET", releaseInfoUrl);
        releaseInfoxhr.onreadystatechange = function () {
            if (releaseInfoxhr.readyState === 4 && releaseInfoxhr.status === 200) {
                var json = JSON.parse(releaseInfoxhr.responseText);
                var most_recent_release_tag = json[0].tag_name;

                var configUrl = "https://raw.githubusercontent.com/gobabygocarswithjoysticks/car-code/" + most_recent_release_tag + "/hex/configurations-info.txt";
                var configxhr = new XMLHttpRequest();
                configxhr.open("GET", configUrl);
                configxhr.onreadystatechange = function () {
                    if (configxhr.readyState === 4 && configxhr.status === 200) {
                        configurations_info = "release\n" + most_recent_release_tag + "\n" + configxhr.responseText;
                        console.log(configurations_info);
                    }
                };
                configxhr.send();

            }
        };

        releaseInfoxhr.send();
    }

}