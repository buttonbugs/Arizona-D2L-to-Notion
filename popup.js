//notion url
const notion_url = "https://notion.so/"
//D2L url
const course_home_url = "https://d2l.arizona.edu/d2l/home/"
const course_content_url = "https://d2l.arizona.edu/d2l/le/content/"
const course_assignment_url = "https://d2l.arizona.edu/d2l/lms/dropbox/user/folders_list.d2l?ou="
const course_discussion_url = "https://d2l.arizona.edu/d2l/le/"
const course_quiz_url = "https://d2l.arizona.edu/d2l/lms/quizzing/user/quizzes_list.d2l?ou="
const course_grade_url = "https://d2l.arizona.edu/d2l/lms/grades/my_grades/main.d2l?ou="
const course_classlist_url = "https://d2l.arizona.edu/d2l/lms/classlist/classlist.d2l?ou="

let d2l_and_notion = document.getElementById("d2l_and_notion").lastElementChild.children

var showing_notion_settings = false
var course_list = [
    ["Loading course list","loading ...",0,"blue"]
]
var notion_status = [
    ["From Notion Database", "Click to sync", 0, "green"],
    ["To Notion Database", "Click to sync", 0, "green"]
]
function load_course_list() {
    /* load course list from storage */
    let course_list_element = document.getElementById("course_list")
    course_list_element.innerHTML = ""
    for (const index in course_list) {
        let course_data = course_list[index];

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
        sync_img_element.setAttribute("src","sync_"+course_data[3]+".svg")
        trash_element.setAttribute("src","trash.svg")

        //addEventListener
        trash_element.addEventListener("click", ((index,event)=>{
            chrome.runtime.sendMessage({
                action: "delete_course",
                payload: index
            }, () => {})
        }).bind(null, index), false)

        detail_element.addEventListener("click", ((index,event)=>{
            window.open(course_home_url+course_list[index][1])
        }).bind(null, index), false)

        //set content
        sync_span_element.innerHTML = course_data[2]
        detail_name_element.innerHTML = course_data[0]
        detail_id_element.innerHTML = "D2L Course ID: "+course_data[1]

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
    if (course_list.length == 0) {
        document.getElementById("course_list_title").firstElementChild.innerHTML = "No Course Added to Sync List"
    } else {
        document.getElementById("course_list_title").firstElementChild.innerHTML = "Sync List"
    }
}

//function
function get_course_index(course_id) {
    var course_index = -1
    for (const index in course_list) {
        if (course_list[index][1] == course_id) {
            course_index = index
        }
    }
    return course_index
}
function compare_url(course_url,url) {
    return url.indexOf(course_url)==0 && url.length > course_url.length
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

async function load_current_tab() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let url = tab.url
    let add_course_element = document.getElementById("add_course")
    var current_course_id = ""
    var current_course_name = ""
    //load course list
    load_course_list()
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
    if (current_course_id != "" && current_course_name != "" && get_course_index(current_course_id) == -1) {
        add_course_element.style.display = "flex"
        let add_course_detail_element = add_course_element.lastElementChild.firstElementChild.children[1]
        add_course_detail_element.firstElementChild.innerHTML = current_course_name
        add_course_detail_element.lastElementChild.innerHTML = "D2L Course ID: " + current_course_id
        add_course_element.lastElementChild.firstElementChild.lastElementChild.onclick = () => {
            chrome.runtime.sendMessage({
                action: "add_course",
                payload: [current_course_name,current_course_id,0,"blue"]
            }, () => {})
        }
    } else {
        add_course_element.style.display = "none"
    }
}

function load_notion_status() {
    chrome.storage.local.get(["notion_status"], (result) => {
        notion_status = result["notion_status"] || [
            ["From Notion Database", "Click to sync", 0, "green"],
            ["To Notion Database", "Click to sync", 0, "green"]
        ]
        for (const index in notion_status) {
            d2l_and_notion[index].firstElementChild.lastElementChild.innerHTML = notion_status[index][2]
            d2l_and_notion[index].firstElementChild.firstElementChild.src = "sync_" + notion_status[index][3] + ".svg"
            d2l_and_notion[index].children[1].lastElementChild.innerHTML = notion_status[index][0]
            d2l_and_notion[index].children[1].lastElementChild.innerHTML = notion_status[index][1]
        }
    })
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
    chrome.runtime.sendMessage({action: "resync"}, () => {})
})
d2l_and_notion[1].children[1].addEventListener("click", () => {
    chrome.runtime.sendMessage({action: "resync"}, () => {})
})
//jump to notion page
d2l_and_notion[0].lastElementChild.addEventListener("click", jump_to_notion_page)
d2l_and_notion[1].lastElementChild.addEventListener("click", jump_to_notion_page)

//Check if current webpage is course home
document.addEventListener("DOMContentLoaded", load_current_tab);

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


//receiving message from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "update_course_status") {
        chrome.storage.local.get(["course_list"], (result) => {
            course_list = result["course_list"] || [];
            load_current_tab()
        })
        sendResponse()
    } else if (message.action === "update_notion_status") {
        load_notion_status()
        sendResponse()
    }
});

//init
//load course list storage
chrome.storage.local.get(["course_list"], (result) => {
    course_list = result["course_list"] || [];
    load_current_tab()
});
//load notion status
load_notion_status()