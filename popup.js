// notion url
const notion_url = "https://notion.so/"

// D2L url
const d2l_host_name = "https://d2l.arizona.edu"
const course_home_url = "https://d2l.arizona.edu/d2l/home/"
const course_content_url = "https://d2l.arizona.edu/d2l/le/content/"
const course_assignment_url = "https://d2l.arizona.edu/d2l/lms/dropbox/user/folders_list.d2l?ou="
const course_discussion_url = "https://d2l.arizona.edu/d2l/le/"
const course_quiz_url = "https://d2l.arizona.edu/d2l/lms/quizzing/user/quizzes_list.d2l?ou="
const course_grade_url = "https://d2l.arizona.edu/d2l/lms/grades/my_grades/main.d2l?ou="
const course_classlist_url = "https://d2l.arizona.edu/d2l/lms/classlist/classlist.d2l?ou="

// ZyBook url
const zybook_host_name = "https://learn.zybooks.com/"
const zybook_course_url = "https://learn.zybooks.com/zybook/"

// Gradescope url
const gradescope_host_name = "https://www.gradescope.com"
const gradescope_course_url = "https://www.gradescope.com/courses/"

// Pearson Master
const pearson_host_name = "pearson.com/"
const pearson_course_home_url = "https://mycourses.pearson.com/course-home#/tab/active"
const pearson_course_url_p1 = "https://session."            // "<subject>-mastering" is treated as course id
const pearson_course_url_p2 = ".pearson.com/myct/"

// WebAssign url
const webassign_host_url = "https://www.webassign.net/"
const webassign_course_url = "https://www.webassign.net/v4cgi/student.pl"
const webassign_assignment_url = "https://www.webassign.net/web/Student/Assignment-Responses/last?dep="

// GitHub url for releases
const github_repo_releases_url = "https://github.com/buttonbugs/Arizona-D2L-to-Notion/releases"

let d2l_and_notion = document.getElementById("d2l_and_notion").lastElementChild.children

var showing_notion_settings = false
var course_list = [
    ["Loading D2L course list","loading ...",0,"blue"]
]
var zybook_list = [
    ['Loading zyBooks list', 'loading ...', 0, 'blue']
]
var gradescope_list = [
    ['Loading Gradescope list', 'loading ...', 0, 'blue']
]
var pearson_list = [
    ['Loading Pearson list', 'loading ...', 0, 'blue']
]
var webassign_list = [
    ['Loading WebAssign list', 'loading ...', 0, 'blue']
]
var notion_status = [
    ["From Notion Database", "Click to sync", 0, "green"],
    ["To Notion Database", "Click to sync", 0, "green"]
]


var latest_version_info = ["", "", false]

/**
 * Course list rendering
 * @param {String} element_id           e.g. `"course_list"`
 * @param {Array} sync_list             e.g. `course_list`
 * @param {String} subtitle           e.g. `"D2L Course ID"`
 * @param {Function} sync_onclick        e.g. `((index) => { ... })`
 * @param {Function} detail_onclick     e.g. `((index) => { ... })`
 * @param {String} course_list_title    e.g. `"D2L Sync List"`
 */
function render_sync_list(element_id, sync_list, subtitle, sync_onclick, detail_onclick) {
    /* load course list from storage */
    let course_list_element = document.getElementById(element_id)
    course_list_element.innerHTML = ""
    for (const index in sync_list) {
        let course_data = sync_list[index];

        //create elements
        let course_element = document.createElement("div")
        let sync_element = document.createElement("div")
        let sync_img_element = document.createElement("img")
        let sync_span_element = document.createElement("span")
        let detail_element = document.createElement("div")
        let detail_name_element = document.createElement("div")
        let detail_id_element = document.createElement("div")
        let trash_element = document.createElement("img")

        //set attributes
        sync_img_element.setAttribute("src","icon/sync/sync_"+course_data[3]+".svg")
        trash_element.setAttribute("src","icon/trash.svg")

        //addEventListener
        trash_element.addEventListener("click", ((index)=>{
            chrome.runtime.sendMessage({
                action: "delete_" + element_id.split("_")[0],
                payload: index
            })
        }).bind(null, index), false)

        sync_element.addEventListener("click", ((index, old_name)=>{
            let new_name = prompt("Rename the course " + old_name + ":", old_name);
            if (new_name) {
                chrome.runtime.sendMessage({
                    action: "rename_" + element_id.split("_")[0],
                    payload: {"index": index, "new_name": new_name}
                })
            }
        }).bind(null, index, sync_list[index][0]), false)
        // sync_element.addEventListener("click", sync_onclick.bind(null, sync_list[index][1]), false)      // Open website in new tab
        detail_element.addEventListener("click", detail_onclick.bind(null, sync_list[index][1]), false)

        //set content
        sync_span_element.innerHTML = course_data[2]
        detail_name_element.innerHTML = course_data[0]
        detail_id_element.innerHTML = subtitle + ": " + course_data[1]

        //append child
        sync_element.appendChild(sync_img_element)
        sync_element.appendChild(sync_span_element)

        detail_element.appendChild(detail_name_element)
        detail_element.appendChild(detail_id_element)
        
        course_element.appendChild(sync_element)
        course_element.appendChild(detail_element)
        course_element.appendChild(trash_element)

        course_list_element.appendChild(course_element)
    }
    if (element_id == "course_list") {
        if (sync_list.length == 0) {
            document.getElementById(element_id + "_title").firstElementChild.innerHTML = "No course added to D2L sync list"
        } else {
            document.getElementById(element_id + "_title").firstElementChild.innerHTML = "D2L Sync List"
        }
    } else {
        if (sync_list.length == 0) {
            document.getElementById(element_id + "_title").style.display = "none"
        } else {
            document.getElementById(element_id + "_title").style.display = ""
        }
    }
}

//function
function get_course_index(course_id, list) {
    var course_index = -1
    for (const index in list) {
        if (list[index][1] == course_id) {
            course_index = index
        }
    }
    return course_index
}

function compare_url(course_url,url) {
    return url.indexOf(course_url) >=0 && url.length > course_url.length
}

async function get_course_name(tab) {
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            let course_full_name = document.getElementsByClassName("d2l-navigation-s-title-container")[0].firstElementChild.innerHTML.split(" ")
            return course_full_name[0]+" "+course_full_name[1]
        }
    })
    return result
}

// Get course name from webpage
async function get_zybook_name(tab) {
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            try {
                let course_full_name = document.getElementsByClassName("zybook-panel-header")[0].firstElementChild.firstElementChild.innerHTML
                return course_full_name.split(":")[0]
            } catch (error) {
                return ""
            }
        }
    })
    return result
}

async function get_gradescope_name(tab) {
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            try {
                let course_full_name = document.getElementsByClassName("sidebar--title sidebar--title-course")[0].firstElementChild.innerHTML.split(" ")
                return course_full_name[0] + " " + course_full_name[1]
            } catch (error) {
                return ""
            }
        }
    })
    return result
}


async function get_webassign_course(tab) {
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',      // Crucial: allows access to the webpage's JS variable
        func: () => {
            try {
                return CengageAnalytics["course"]   // The webpage's variable
            } catch (error) {
                return {"contextId": "", "name": ""}
            }
        }
    })
    return result
}

async function load_current_tab_info() {
    //render d2l course list
    render_sync_list("course_list", course_list, "D2L Course ID",
        ((course_id)=>{
            window.open(course_home_url + course_id)
        }),
        ((course_id)=>{
            window.open(course_content_url + course_id + "/Home")
        }),
        "D2L Sync List"
    )
    render_sync_list("zybook_list", zybook_list, "zyBook code",
        ((course_id)=>{
            window.open(zybook_course_url + course_id + zybook_assignment_tag)
        }),
        ((course_id)=>{
            window.open(zybook_course_url + course_id)
        })
    )
    render_sync_list("gradescope_list", gradescope_list, "Gradescope Course ID",
        ((course_id)=>{
            window.open(gradescope_course_url + course_id)
        }),
        ((course_id)=>{
            window.open(gradescope_course_url + course_id)
        })
    )
    render_sync_list("pearson_list", pearson_list, "Master",
        ((course_id)=>{
            window.open(pearson_course_home_url)
        }),
        ((course_id)=>{
            window.open(pearson_course_url_p1 + course_id + pearson_course_url_p2)
        })
    )
    render_sync_list("webassign_list", webassign_list, "WebAssign Course ID",
        ((course_id)=>{
            window.open(webassign_course_url)
        }),
        ((course_id)=>{
            window.open(webassign_course_url)
        })
    )

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let url = tab.url
    let add_course_element = document.getElementById("add_course")
    var current_course_id = ""
    var current_course_name = ""
    var logo = "logo/arizona.png"

    // get course id and course name from url
    if (compare_url(d2l_host_name,url)) {
        logo = "logo/arizona.png"
        if (compare_url(course_home_url,url)) {
            current_course_id = url.split("/")[5]
            current_course_name = await get_course_name(tab)
        } else if (compare_url(course_content_url, url)) {
            current_course_id = url.split("/")[6]
            current_course_name = await get_course_name(tab)
        } else if (compare_url(course_assignment_url, url)) {
            current_course_id = url.split("ou=")[1].split("&")[0]
            current_course_name = await get_course_name(tab)
        } else if (compare_url(course_discussion_url, url) && url.indexOf("/discussions/List") > course_discussion_url.length) {
            current_course_id = url.split("/")[5]
            current_course_name = await get_course_name(tab)
        } else if (compare_url(course_quiz_url, url)) {
            current_course_id = url.split("ou=")[1].split("&")[0]
            current_course_name = await get_course_name(tab)
        } else if (compare_url(course_grade_url, url)) {
            current_course_id = url.split("ou=")[1].split("&")[0]
            current_course_name = await get_course_name(tab)
        } else if (compare_url(course_classlist_url, url)) {
            current_course_id = url.split("ou=")[1].split("&")[0]
            current_course_name = await get_course_name(tab)
        }
    } else if (compare_url(zybook_host_name,url)) {
        logo = "logo/zybooks.png"
        if (compare_url(zybook_course_url,url)) {
            current_course_id = url.split("?")[0].split("/")[4]
            current_course_name = await get_zybook_name(tab)
        }
    } else if (compare_url(gradescope_host_name,url)) {
        logo = "logo/gradescope.png"
        if (compare_url(gradescope_course_url,url)) {
            current_course_id = url.split("?")[0].split("/")[4]
            current_course_name = await get_gradescope_name(tab)
        }
    } else if (compare_url(pearson_host_name,url)) {
        logo = "logo/pearson.png"
        if (compare_url(pearson_course_url_p1,url) && compare_url(pearson_course_url_p2,url)) {
            current_course_id = url.split(pearson_course_url_p2)[0].split(pearson_course_url_p1)[1]
            current_course_name = current_course_id.split("-")[1] + " " + current_course_id.split("-")[0]
        }
    } else if (compare_url(webassign_host_url, url)) {
        logo = "logo/webassign.png"
        if (compare_url(webassign_course_url, url) || compare_url(webassign_assignment_url, url)) {
            let webassign_course_data = await get_webassign_course(tab);
            console.log(webassign_course_data);
            current_course_id = webassign_course_data["contextId"].split("-").at(-1);
            current_course_name = webassign_course_data["name"].split(" ").slice(0,2).join(" ");
        }
    }

    // Convert course name to upper case, especially in Gradescope
    current_course_name = current_course_name.toUpperCase()
    
    // check if the course id and the course name are available
    if (current_course_id != "" && current_course_name != "") {
        // course logo
        let add_course_logo_element = add_course_element.lastElementChild.firstElementChild.firstElementChild.firstElementChild
        add_course_logo_element.src = logo
        
        // course detail
        let add_course_detail_element = add_course_element.lastElementChild.firstElementChild.children[1]
        add_course_detail_element.firstElementChild.innerHTML = current_course_name

        // check which websites it belongs to and whether the course already exists in the course lists
        if (logo == "logo/arizona.png" && get_course_index(current_course_id, course_list) == -1) {

            add_course_detail_element.lastElementChild.innerHTML = "D2L Course ID: " + current_course_id
            add_course_element.lastElementChild.firstElementChild.lastElementChild.onclick = () => {
                chrome.runtime.sendMessage({
                    action: "add_course",
                    payload: [current_course_name,current_course_id,0,"blue"]
                })
            }
            
            add_course_element.style.display = "flex"
        } else if (logo == "logo/zybooks.png" && get_course_index(current_course_id, zybook_list) == -1) {

            add_course_detail_element.lastElementChild.innerHTML = "zyBooks code: " + current_course_id
            add_course_element.lastElementChild.firstElementChild.lastElementChild.onclick = () => {
                chrome.runtime.sendMessage({
                    action: "add_zybook",
                    payload: [current_course_name,current_course_id,0,"blue"]
                })
            }
            
            add_course_element.style.display = "flex"
        } else if (logo == "logo/gradescope.png" && get_course_index(current_course_id, gradescope_list) == -1) {

            add_course_detail_element.lastElementChild.innerHTML = "Gradescope Course ID: " + current_course_id
            add_course_element.lastElementChild.firstElementChild.lastElementChild.onclick = () => {
                chrome.runtime.sendMessage({
                    action: "add_gradescope",
                    payload: [current_course_name,current_course_id,0,"blue"]
                })
            }
            
            // Show "Add this to your sync list?"
            add_course_element.style.display = "flex"
        } else if (logo == "logo/pearson.png" && get_course_index(current_course_id, pearson_list) == -1) {

            add_course_detail_element.lastElementChild.innerHTML = pearson_course_url_p1 + current_course_id + pearson_course_url_p2
            add_course_element.lastElementChild.firstElementChild.lastElementChild.onclick = () => {
                chrome.runtime.sendMessage({
                    action: "add_pearson",
                    payload: [current_course_name,current_course_id,0,"blue"]
                })
            }
            
            // Show "Add this to your sync list?"
            add_course_element.style.display = "flex"
        } else if (logo == "logo/webassign.png" && get_course_index(current_course_id, webassign_list) == -1) {

            add_course_detail_element.lastElementChild.innerHTML = "WebAssign Course ID: " + current_course_id
            add_course_element.lastElementChild.firstElementChild.lastElementChild.onclick = () => {
                chrome.runtime.sendMessage({
                    action: "add_webassign",
                    payload: [current_course_name,current_course_id,0,"blue"]
                })
            }
            
            // Show "Add this to your sync list?"
            add_course_element.style.display = "flex"
        } else {
            // Hide "Add this to your sync list?"
            add_course_element.style.display = "none"
        }
    } else {
        // Hide "Add this to your sync list?"
        add_course_element.style.display = "none"
    }
}

function load_notion_status() {
    for (const index in notion_status) {
        d2l_and_notion[index].firstElementChild.lastElementChild.innerHTML = notion_status[index][2]
        d2l_and_notion[index].firstElementChild.firstElementChild.src = "icon/sync/sync_" + notion_status[index][3] + ".svg"
        d2l_and_notion[index].children[1].lastElementChild.innerHTML = notion_status[index][0]
        d2l_and_notion[index].children[1].lastElementChild.innerHTML = notion_status[index][1]
    }
}

function jump_to_notion_page() {
    chrome.storage.local.get(["notion_settings_database"], (result) => {
        if (result["notion_settings_database"]) {
            window.open(notion_url + result["notion_settings_database"].replaceAll("-", ""))
        }
    })
}

//addEventListener
//Show Notion Setting
document.getElementById("notion_settings_button").addEventListener("click", () => {
    showing_notion_settings = !showing_notion_settings
    document.getElementById("notion_settings_button").style.rotate = showing_notion_settings ? "135deg" : "45deg"
    document.getElementById("notion_settings").style.height = showing_notion_settings ? "96px" : "0"
});
//notion_settings_token
document.getElementById("notion_settings_token").addEventListener("input", (event)=>{
    chrome.storage.local.set({ "notion_settings_token": event.target.value }, () => {
        console.log("notion_settings_token saved");
    });
})
//notion_settings_data_sourse
document.getElementById("notion_settings_data_sourse").addEventListener("input", (event)=>{
    chrome.storage.local.set({ "notion_settings_data_sourse": event.target.value }, () => {
        console.log("notion_settings_data_sourse saved");
    });
})
//notion_settings_database
document.getElementById("notion_settings_database").addEventListener("input", (event)=>{
    chrome.storage.local.set({ "notion_settings_database": event.target.value }, () => {
        console.log("notion_settings_database saved");
    });
})
//resync
d2l_and_notion[0].children[1].addEventListener("click", () => {
    chrome.runtime.sendMessage({action: "resync"})
})
d2l_and_notion[1].children[1].addEventListener("click", () => {
    chrome.runtime.sendMessage({action: "resync"})
})
//jump to notion page
d2l_and_notion[0].lastElementChild.addEventListener("click", jump_to_notion_page)
d2l_and_notion[1].lastElementChild.addEventListener("click", jump_to_notion_page)

//load notion settings storage
chrome.storage.local.get(["notion_settings_token"], (result) => {
    document.getElementById("notion_settings_token").value = result["notion_settings_token"] || "";
});
chrome.storage.local.get(["notion_settings_data_sourse"], (result) => {
    document.getElementById("notion_settings_data_sourse").value = result["notion_settings_data_sourse"] || "";
});
chrome.storage.local.get(["notion_settings_database"], (result) => {
    document.getElementById("notion_settings_database").value = result["notion_settings_database"] || "";
});

/* init */
// load notion status
chrome.storage.local.get(["notion_status"], (result) => {
    notion_status = result["notion_status"] || [];
    load_notion_status()
});
// load latest_version_info
chrome.storage.local.get(["latest_version_info"], (result) => {
    latest_version_info = result["latest_version_info"] || ["", "", false];

    const latest_version_info_element = document.getElementById("latest_version_info");
    latest_version_info_element.addEventListener("click", ()=>{
        window.open(github_repo_releases_url);
    })

    if (latest_version_info[2]) {
        latest_version_info_element.style.display = "flex";
        latest_version_info_element.firstElementChild.children[1].lastElementChild.innerHTML = "Arizona D2L to Notion " + latest_version_info[0] + " | " + latest_version_info[1];
    } else {
        latest_version_info_element.style.display = "none";
    }
});



// get course list
(async () => {
    const result = await chrome.storage.local.get(["course_list", "zybook_list", "gradescope_list", "pearson_list", "webassign_list"]);
    course_list = result["course_list"] || [];
    zybook_list = result["zybook_list"] || [];
    gradescope_list = result["gradescope_list"] || [];
    pearson_list = result["pearson_list"] || [];
    webassign_list = result["webassign_list"] || [];

    load_current_tab_info()
    
    // When storage changes
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local") {
            if (changes["course_list"]) {
                course_list = changes["course_list"].newValue || [];
                load_current_tab_info()
            }
            if (changes["zybook_list"]) {
                zybook_list = changes["zybook_list"].newValue || [];
                load_current_tab_info()
            }
            if (changes["gradescope_list"]) {
                gradescope_list = changes["gradescope_list"].newValue || [];
                load_current_tab_info()
            }
            if (changes["pearson_list"]) {
                pearson_list = changes["pearson_list"].newValue || [];
                load_current_tab_info()
            }
            if (changes["webassign_list"]) {
                webassign_list = changes["webassign_list"].newValue || [];
                load_current_tab_info()
            }
            if (changes["notion_status"]) {
                notion_status = changes["notion_status"].newValue || [
                    ["From Notion Database", "Click to sync", 0, "green"],
                    ["To Notion Database", "Click to sync", 0, "green"]
                ]
                load_notion_status()
            }
        }
    });
})();
