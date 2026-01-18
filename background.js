/* constant */
// d2l url
const content_url_p1="https://d2l.arizona.edu/d2l/le/content/"
const content_url_p2="/Home"
const content_json_url="/PartialMainView?identifier=TOC&moduleTitle=Table+of+Contents&_d2l_prc%24headingLevel=2&_d2l_prc%24scope=&_d2l_prc%24hasActiveForm=false&isXhr=true"
const assignments_url = "https://d2l.arizona.edu/d2l/lms/dropbox/user/folders_list.d2l?isprv=0&ou="
const discussions_url_p1 = "https://d2l.arizona.edu/d2l/le/"
const discussions_url_p2 = "/discussions/List"
const quiz_url = "https://d2l.arizona.edu/d2l/lms/quizzing/user/quizzes_list.d2l?ou="

// zyBook url
const zybook_assignment_p1 = "https://zyserver.zybooks.com/v1/zybook/"
const zybook_assignment_p2 = "/assignments"
const zybook_course_url = "https://learn.zybooks.com/zybook/"
const zybook_assignment_tag = "?selectedPanel=assignments-panel&assignment_id="     // The parameter assignment_id is just an identifier. It does not really exist
const zybook_local_auth_key = "ember_simple_auth-session-5"

// notion url
const notion_query_data_sourse_url_p1 = "https://api.notion.com/v1/data_sources/"
const notion_query_data_sourse_url_p2 = "/query"
const notion_create_page_url = `https://api.notion.com/v1/pages`
const notion_update_page_url = `https://api.notion.com/v1/pages/`

//notion api settings
const notion_page_size = 100

/* variable */
// Status
var course_list = []
var notion_status = [
    ["From Notion Database", "Loading ...", 0, "green"],
    ["To Notion Database", "Loading ...", 0, "green"]
]
var zybook_list = []
var zybook_token = ""

// Notion
var notion_token = ""
var data_source_id = ""
var database_id = ""

// Log on behalf of host
function host_log(tab,content) {
    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: (content) => {
            console.log(content);
        },
        args: [content]
    });
}

// Copy on behalf of host
function host_copy(tab,content) {
    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: (content) => {
            navigator.clipboard.writeText(content);
        },
        args: [content]
    });
}

function task_exist(tab, new_task, notion_result) {
    for (const existing_task of notion_result) {
        if (existing_task.properties.Link.url) {
            if (existing_task.properties.Link.url == new_task["Link"]) {
                return existing_task
            }
        } else if (
            existing_task.properties.Task.title[0].plain_text == new_task["Task"] &&
            existing_task.properties.Course.select.name == new_task["Course"]
        ) {
            return existing_task
        }
    }
    return null
}

/* store data -> trigger chrome.storage.onChanged in popup.js */

function store_course_list() {
    chrome.storage.local.set({ "course_list": course_list }, () => {/* debug */})
}

function store_zybook_list() {
    chrome.storage.local.set({ "zybook_list": zybook_list }, () => {/* debug */})
}

function store_zybook_token() {
    chrome.storage.local.set({ "zybook_token": zybook_token }, () => {/* debug */})
}

function store_notion_status() {
    chrome.storage.local.set({ "notion_status": notion_status }, () => {/* debug */})
}

/* Fetch course data from D2L, zyBooks, etc. and sync them to Notion */
async function fetch_couse_data(tab) {
    //fetch more than 100 result
    var task_list = []
    var notion_result = []
    var notion_response = {}
    var next_cursor = ""
    var has_more = true

    //reset notion sync status
    notion_status = [
        ["From Notion Database", "Loading ...", 0, "blue"],
        ["To Notion Database", "Wait ...", 0, "orange"]
    ]
    store_notion_status()
    while (has_more) {
        //fetch data from notion
        notion_response = await fetchNotion(tab, next_cursor)
        notion_result.push(...notion_response.results)

        //change cursor
        next_cursor = notion_response.next_cursor
        has_more = notion_response.has_more

        //update notion status
        notion_status[0][2] = notion_result.length
        store_notion_status()
    }
    notion_status[0][1] = "Synced " + new Date().toLocaleString()
    notion_status[0][3] = "green"
    notion_status[1][1] = "Fetching course data ..."
    store_notion_status()

    /* Fetch course data from D2L webpage */
    // Reset course_list status
    for (const index in course_list) {
        course_list[index][2] = 0
        course_list[index][3] = "orange"
    }

    // Reset zybook_list status
    for (const index in zybook_list) {
        zybook_list[index][2] = 0
        zybook_list[index][3] = "orange"
    }
    store_zybook_list()

    // Push Assignments
    for (const index in course_list) {
        course_list[index][3] = "blue"
        store_course_list()
        const course_item = course_list[index]
        //Get Assignments webpage
        let response = await fetch(assignments_url + course_item[1],{
            method: "GET",
            credentials: "include"
        })
        let data = await response.text();
        //Parse Assignments webpage
        try {
            task_list.push(...await new Promise((resolve) => {
                chrome.tabs.sendMessage(
                    tab.id,
                    {
                        action: "parse_Assignments",
                        payload: {
                            html_text: data,
                            course_name: course_item[0]
                        }
                    },
                    function(task_list) {
                        if (task_list) {
                            course_list[index][2] += task_list.length
                            course_list[index][3] = "orange"
                            store_course_list()
                            resolve(task_list);
                        } else {
                            resolve([]);
                        }
                    }
                )
            }))
        } catch (error) {
            course_list[index][3] = "red"
            store_course_list()
            host_log(tab, "Parse Assignments webpage error")
        }
    }
    
    // Push Discussions
    for (const index in course_list) {
        course_list[index][3] = "blue"
        store_course_list()
        const course_item = course_list[index]
        //Get Discussions webpage
        let response = await fetch(discussions_url_p1 + course_item[1] + discussions_url_p2,{
            method: "GET",
            credentials: "include"
        })
        let data = await response.text();
        //Parse Discussions webpage
        try {
            task_list.push(...await new Promise((resolve) => {
                chrome.tabs.sendMessage(
                    tab.id,
                    {
                        action: "parse_Discussions",
                        payload: {
                            html_text: data,
                            course_name: course_item[0]
                        }
                    },
                    function(task_list) {
                        if (task_list) {
                            course_list[index][2] += task_list.length
                            course_list[index][3] = "orange"
                            store_course_list()
                            resolve(task_list);
                        } else {
                            resolve([]);
                        }
                    }
                )
            }))
        } catch (error) {
            course_list[index][3] = "red"
            store_course_list()
            host_log(tab, "Parse Discussions webpage error")
        }
    }

    // Push Quiz
    for (const index in course_list) {
        course_list[index][3] = "blue"
        store_course_list()
        const course_item = course_list[index]
        //Get Quiz webpage
        let response = await fetch(quiz_url + course_item[1],{
            method: "GET",
            credentials: "include"
        })
        let data = await response.text();
        //Parse Quiz webpage
        try {
            task_list.push(...await new Promise((resolve) => {
                chrome.tabs.sendMessage(
                    tab.id,
                    {
                        action: "parse_Quiz",
                        payload: {
                            html_text: data,
                            course_name: course_item[0],
                            course_id: course_item[1]
                        }
                    },
                    function(task_list) {
                        if (task_list) {
                            course_list[index][2] += task_list.length
                            course_list[index][3] = "orange"
                            store_course_list()
                            resolve(task_list);
                        } else {
                            resolve([]);
                        }
                    }
                )
            }))
        } catch (error) {
            course_list[index][3] = "red"
            store_course_list()
            host_log(tab, "Parse Quiz webpage error")
        }
    }
    // Push Content
    for (const index in course_list) {
        const course_item = course_list[index]
        break;//Not necessary to get the content page
        //Get Discussions webpage
        let response = await fetch(content_url_p1 + course_item[1] + content_json_url,{
            method: "GET",
            credentials: "include"
        })
        let data = await response.text();
        let json_data = JSON.parse(data.slice(9))
        let html_text = json_data.Payload.Html
        //Parse Discussions webpage
        let new_task = (await new Promise((resolve) => {
            chrome.tabs.sendMessage(
                tab.id,
                {
                    action: "parse_Content",
                    payload: {
                        html_text: html_text,
                        course_name: course_item[0]
                    }
                },
                function(task_list) {
                    resolve(task_list);
                }
            )
        }))
        host_log(tab, new_task)
    }

    // Set course sync status to green
    for (const index in course_list) {
        course_list[index][3] = "green"
    }
    store_course_list()
    
    /* Fetch ZyBook Data */
    for (const index in zybook_list) {
        zybook_list[index][3] = "blue"
        store_zybook_list()  // temp -> send_zybook_list
        const zybook_item = zybook_list[index]
        //Get Assignments webpage
        let response = await fetch(zybook_assignment_p1 + zybook_item[1] + zybook_assignment_p2,{
            method: "GET",
            credentials: "include",
            headers: {
                "Authorization": `Bearer ${zybook_token}`,
                "Accept": "application/json"
            }
        })
        const data = await response.json();
        if (data.success && data.assignments) {
            for (const assignment of data.assignments) {
                // Link
                let link = assignment.assignment_id ? zybook_course_url + zybook_item[1] + zybook_assignment_tag + assignment.assignment_id : null

                // Status
                var status = null
                var has_zero = false
                var has_one = false
                for (const section of assignment.activity_data) {
                    for (const activity of section.section_activity_data) {
                        has_zero ||= activity.activity_data.includes(0)
                        has_one ||= activity.activity_data.includes(1)
                    }
                }
                // In order to leave the option "To Do", (has_zero && has_one) and (has_zero && !has_one) are discussed here
                if (!has_zero && has_one) {
                    status = "Done"
                }

                // Due Date - caution new Date() input: UTC, output: local time zone
                let due_date_string = assignment.due_dates[0] ? new Date(assignment.due_dates[0].date).toLocaleDateString('sv-SE') : null
                let new_task = {
                    "Link": link,
                    "Status": status,
                    "Course": zybook_item[0],
                    "Due Date": due_date_string,
                    "Type": null,
                    "Task": assignment.title || ""
                }
                task_list.push(new_task);
                zybook_list[index][2] += 1;
                store_zybook_list()
            }
            zybook_list[index][3] = "green"
        } else {
            zybook_list[index][3] = "red"
        }
        store_zybook_list()
        host_log(tab,data);
    }
    store_zybook_list()

    // host_log(tab,task_list);

    /* Add task_list to Notion */
    notion_status[1][1] = "Syncing course data - 0.0%"
    notion_status[1][3] = "blue"
    store_notion_status()
    for (const new_task of task_list) {
        let existing_task = task_exist(tab, new_task, notion_result)
        if (existing_task) {
            let properties = {}
            if (new_task["Status"]) { properties["Status"] = {"status": { "name": new_task["Status"] }}; }
            if (new_task["Due Date"]) { properties["Due Date"] = {"date": {"start": new_task["Due Date"]}}; }
            if (new_task["Link"]) { properties["Link"] = {"url": new_task["Link"]}; }
            fetch(notion_update_page_url+existing_task.id, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${notion_token}`,
                    "Notion-Version": "2025-09-03",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "properties": properties
                })
            })
            .then(response => {return response.json()})
            .then(data => {
                notion_status[1][2] += 1
                notion_status[1][1] = "Syncing course data - " + (notion_status[1][2]*100.0/task_list.length).toFixed(1) + "%"
                if (notion_status[1][2] >= task_list.length) {
                    notion_status[1][1] = "Synced " + new Date().toLocaleString()
                    notion_status[1][3] = "green"
                }
                store_notion_status()
            })
        } else {
            let properties = {
                "Course": {"select": {"name": new_task["Course"]}},
                "Task": {"title": [{"text": { "content": new_task["Task"] }}]}
            }
            //Sometimes Type, Status, Link and Due Date are null
            if (new_task["Status"]) { properties["Status"] = {"status": {"name": (new_task["Status"] ? new_task["Status"] : "Not started" )}}; }
            if (new_task["Due Date"]) { properties["Due Date"] = {"date": {"start": new_task["Due Date"]}}; }
            if (new_task["Type"]) { properties["Type"] = {"select": {"name": new_task["Type"]}}; }
            if (new_task["Link"]) { properties["Link"] = {"url": new_task["Link"]}; }
            //Known Type
            fetch(notion_create_page_url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${notion_token}`,
                    "Notion-Version": "2025-09-03",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "parent": { "database_id": database_id },
                    "properties": properties
                })
            })
            .then(response => {return response.json()})
            .then(data => {
                notion_status[1][2] += 1
                notion_status[1][1] = "Syncing course data - " + (notion_status[1][2]*100.0/task_list.length).toFixed(1) + "%"
                if (notion_status[1][2] >= task_list.length) {
                    notion_status[1][1] = "Synced " + new Date().toLocaleString()
                    notion_status[1][3] = "green"
                }
                store_notion_status()
            })
        }
    }
}

/* Fetch data from Notion to the chrome extension */
async function fetchNotion(tab, next_cursor = "") {
    var body = {"page_size": notion_page_size}
    if (next_cursor) {
        body["start_cursor"] = next_cursor
    }
    const response = await fetch(notion_query_data_sourse_url_p1 + data_source_id + notion_query_data_sourse_url_p2, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${notion_token}`,
            "Notion-Version": "2025-09-03",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    })
    const data = await response.json();
    return data
}

/* Get Authorization Tokens */
async function get_zybook_auth(tab) {
    try {
        /* Get zybook auth -> token */
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [zybook_local_auth_key], // ( Optional ) Pass data into "func: () => {}"
            func: (auth_key) => {
                // This runs in the context of the zybook webpage
                return localStorage.getItem(auth_key);
            },
        });
    
        // results[0].result contains the value returned by the function
        const auth_info = JSON.parse(results[0].result)
        
        /* Get token from auth_info */
        // Get session
        const session = auth_info.authenticated.session

        // Get session info
        const auth_token = session.auth_token
        const refresh_token = session.refresh_token
        const expiry_date = session.expiry_date

        // Set and store token
        zybook_token = auth_token
        store_zybook_token()
        
    } catch (error) {}

    fetch_couse_data(tab);
}

async function sync_data(tab) {
    /* Get data from Local Storage (Data preview: Sevice Worker Inspect -> Application -> Storage -> Extension Storage -> Local) */
    const storage_data = await chrome.storage.local.get(null)
    /* 
        chrome.storage.local.get() Parameter:

        null                                        ->  get all data
        ["course_list", "notion_settings_token"]    ->  get specific data
    */

    course_list = storage_data["course_list"] || [];
    zybook_list = storage_data["zybook_list"] || [];
    zybook_token = storage_data["zybook_token"] || "";
    notion_token = storage_data["notion_settings_token"] || "";
    data_source_id = storage_data["notion_settings_data_sourse"] || "";
    database_id = storage_data["notion_settings_database"] || "";

    /* Start fetching data */
    if (notion_status[1][3] != "orange") {
        if (tab.url.includes("d2l.arizona.edu")) {
            try {
                fetch_couse_data(tab);
            } catch (error) {
                host_log(tab, "crx fetch_D2L_data() error")
                notion_status[1][3] = "red"
                store_notion_status()
            }
        } else if (tab.url.includes("learn.zybooks.com")) {
            try {
                get_zybook_auth(tab);
            } catch (error) {
                host_log(tab, "crx zybook error")
                notion_status[1][3] = "red"
                store_notion_status()
            }
        }
    }
}

/* Event Listeners */
//Triggers when webpage loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        sync_data(tab)
    }
})

//Receive messages
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === "add_course") {              // D2L
        course_list.push(message.payload)
        store_course_list()
    } else if (message.action === "delete_course") {
        course_list.splice(message.payload, 1)
        store_course_list()
    } else if (message.action === "add_zybook") {       // zybook
        zybook_list.push(message.payload)
        store_zybook_list()
    } else if (message.action === "delete_zybook") {
        zybook_list.splice(message.payload, 1)
        store_zybook_list()
    } else if (message.action === "resync") {           // resync
        // Triggers when "From/To Notion Database" button clicked
        if (notion_status[1][3] == "green") {
            chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
                sync_data(tabs[0])
            })
        }
    }
});