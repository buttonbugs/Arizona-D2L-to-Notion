//d2l url
const d2l_host_name = "d2l.arizona.edu"
const content_url_p1="https://d2l.arizona.edu/d2l/le/content/"
const content_url_p2="/Home"
const content_json_url="/PartialMainView?identifier=TOC&moduleTitle=Table+of+Contents&_d2l_prc%24headingLevel=2&_d2l_prc%24scope=&_d2l_prc%24hasActiveForm=false&isXhr=true"
const assignments_url = "https://d2l.arizona.edu/d2l/lms/dropbox/user/folders_list.d2l?isprv=0&ou="
const discussions_url_p1 = "https://d2l.arizona.edu/d2l/le/"
const discussions_url_p2 = "/discussions/List"
const quiz_url = "https://d2l.arizona.edu/d2l/lms/quizzing/user/quizzes_list.d2l?ou="
//notion url
const notion_query_data_sourse_url_p1 = "https://api.notion.com/v1/data_sources/"
const notion_query_data_sourse_url_p2 = "/query"
const notion_create_page_url = `https://api.notion.com/v1/pages`
const notion_update_page_url = `https://api.notion.com/v1/pages/`
//course list
var course_list = []
//Notion
var NOTION_TOKEN = ""
var data_source_id = ""
var database_id = ""

// Trigger when pages load
function host_log(tab,content) {
    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: (content) => {
            console.log(content);
        },
        args: [content]
    });
}

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
            if(new_task["Link"]){
                if (existing_task.properties.Link.url == new_task["Link"]) {
                    return existing_task
                }
            } else {
                if (existing_task.properties.Task.title.text.content == new_task["Task"]) {
                    return existing_task
                }
            }
        }
    }
    return null
}

function send_course_list() {
    chrome.storage.local.set({ "course_list": course_list }, () => {
        chrome.runtime.sendMessage({ action: "updata_sync_status" }, (response) => {})
    })
}

async function fetchCourseDetail(tab) {
    //fetch more than 100 result
    var notion_result = []
    var notion_response = {}
    var next_cursor = ""
    var has_more = true
    while (has_more) {
        notion_response = await fetchNotion(tab, next_cursor)
        notion_result.push(...notion_response.results)
        next_cursor = notion_response.next_cursor
        has_more = notion_response.has_more
    }
    var task_list = []
    //reset sync status
    for (const index in course_list) {
        course_list[index][2] = 0
        course_list[index][3] = "orange"
    }
    //Push Assignments
    for (const index in course_list) {
        course_list[index][3] = "blue"
        send_course_list()
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
                            d2l_host_name: d2l_host_name,
                            course_name: course_item[0]
                        }
                    },
                    function(task_list) {
                        course_list[index][2] += task_list.length
                        course_list[index][3] = "orange"
                        send_course_list()
                        resolve(task_list);
                    }
                )
            }))
        } catch (error) {
            host_log(tab, "Parse Assignments webpage error")
        }
    }
    //Push Discussions
    for (const index in course_list) {
        course_list[index][3] = "blue"
        send_course_list()
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
                            d2l_host_name: d2l_host_name,
                            course_name: course_item[0]
                        }
                    },
                    function(task_list) {
                        course_list[index][2] += task_list.length
                        course_list[index][3] = "orange"
                        send_course_list()
                        resolve(task_list);
                    }
                )
            }))
        } catch (error) {
            host_log(tab, "Parse Discussions webpage error")
        }
    }
    //Push Quiz
    for (const index in course_list) {
        course_list[index][3] = "blue"
        send_course_list()
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
                            d2l_host_name: d2l_host_name,
                            course_name: course_item[0],
                            course_id: course_item[1]
                        }
                    },
                    function(task_list) {
                        course_list[index][2] += task_list.length
                        course_list[index][3] = "orange"
                        send_course_list()
                        resolve(task_list);
                    }
                )
            }))
        } catch (error) {
            host_log(tab, "Parse Quiz webpage error")
        }
    }
    //Push Content
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
                        d2l_host_name: d2l_host_name,
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
    // add task_list to Notion
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
                    "Authorization": `Bearer ${NOTION_TOKEN}`,
                    "Notion-Version": "2025-09-03",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "properties": properties
                })
            })
            .then(response => {return response.json()})
            .then(data => {
                //updated
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
                    "Authorization": `Bearer ${NOTION_TOKEN}`,
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
            })
        }
    }
    //set sync status to green
    for (const index in course_list) {
        course_list[index][3] = "green"
    }
    send_course_list()
}

async function fetchNotion(tab, next_cursor = "") {
    var body = {"page_size": 10}
    if (next_cursor) {
        body["start_cursor"] = next_cursor
    }
    const response = await fetch(notion_query_data_sourse_url_p1 + data_source_id + notion_query_data_sourse_url_p2, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${NOTION_TOKEN}`,
            "Notion-Version": "2025-09-03",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    })
    const data = await response.json();
    return data
}
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url.includes("d2l.arizona.edu")) {
        //load course list storage
        chrome.storage.local.get(["course_list"], (result) => {
            course_list = result["course_list"] || [];

            //load NOTION_TOKEN
            chrome.storage.local.get(["notion_settings_token"], (result) => {
                NOTION_TOKEN = result["notion_settings_token"] || "";

                //load data_source_id
                chrome.storage.local.get(["notion_settings_data_sourse"], (result) => {
                    data_source_id = result["notion_settings_data_sourse"] || "";

                    //load database_id
                    chrome.storage.local.get(["notion_settings_database"], (result) => {
                        database_id = result["notion_settings_database"] || "";
                        
                        try {
                            fetchCourseDetail(tab);
                        } catch (error) {
                            host_log (tab, "crx error")
                        }
                    })
                })
            })
        })
    }
});