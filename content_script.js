const quiz_detail_url_p1 = "https://d2l.arizona.edu/d2l/lms/quizzing/user/quiz_summary.d2l?qi="
const quiz_detail_url_p2 = "&ou="
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action == "parse_Assignments") {
        var task_list = []
        let parser = new DOMParser();
        let doc = parser.parseFromString(message.payload.html_text, "text/html");
        try {
            let tr_elements = doc.getElementById("z_a").firstChild.childNodes

            tr_elements.forEach(tr => {
                if (tr.className == "") {
                    let due_date_element = tr.firstChild.childNodes[3].getElementsByTagName("strong")[0]
                    let due_date_string = due_date_element? new Date(due_date_element.innerText.split(" ").slice(2,5).join(" ")).toISOString().split('T')[0] : null
                    let new_task = {
                        "Link": tr.getElementsByClassName("d2l-link-inline")[0].href,
                        "Status": tr.childNodes[1].firstChild.innerText.indexOf("Submission") > -1 ? "Done" : null,
                        "Course": message.payload.course_name,
                        "Due Date": due_date_string,
                        "Type": null,
                        "Task": tr.getElementsByTagName("strong")[0].innerText
                    }
                    task_list.push(new_task)
                }
            });
        } catch (error) {}
        sendResponse(task_list);
    } else if (message.action == "parse_Discussions") {
        var task_list = []
        let parser = new DOMParser();
        let doc = parser.parseFromString(message.payload.html_text, "text/html");
        try {
            let tr_elements = doc.getElementsByClassName("d2l-grid-row")
            for (const tr of tr_elements) {
                let new_task = {
                    "Link": tr.getElementsByClassName("d2l-linkheading-link")[0].href,
                    "Status": null,
                    "Course": message.payload.course_name,
                    "Due Date": null,
                    "Type": "Discussion",
                    "Task": tr.getElementsByClassName("d2l-linkheading-link")[0].innerText
                }
                task_list.push(new_task)
            }
        } catch (error) {}
        sendResponse(task_list);
    } else if (message.action == "parse_Quiz") {
        var task_list = []
        let parser = new DOMParser();
        let doc = parser.parseFromString(message.payload.html_text, "text/html");
        try {
            let tr_elements = doc.getElementById("z_b").firstChild.childNodes
            for (const tr of tr_elements) {
                if (tr.className == "") {
                    //get link
                    let link_js = tr.getElementsByClassName("d2l-link-inline")[0].getAttribute("onclick")
                    let quiz_id = link_js.split("(")[1].split(",")[0]
                    let link = quiz_detail_url_p1 + quiz_id + quiz_detail_url_p2 + message.payload.course_id
                    //get due date
                    let due_date_elements = tr.getElementsByClassName("ds_b")
                    let due_date_string = null
                    if (due_date_elements.length > 0) {
                        let due_date_original_text = due_date_elements[0].firstChild.textContent
                        if (due_date_original_text.indexOf("Due on ") > -1) {
                            due_date_string = new Date(due_date_original_text.split(" ").slice(2,5)).toISOString().split('T')[0]
                        }
                    }
                    let new_task = {
                        "Link": link,
                        "Status": tr.lastChild.childNodes[1].className == "di_s" ? "In progress" : (tr.lastChild.firstChild.innerText * 1 > 0 ? "Done" : null),
                        "Course": message.payload.course_name,
                        "Due Date": due_date_string,
                        "Type": null,
                        "Task": tr.getElementsByClassName("d2l-link-inline")[0].innerText
                    }
                    task_list.push(new_task)
                }
            }
        } catch (error) {}
        sendResponse(task_list);
    } else if (message.action == "parse_Content") {
        var task_list = []
        let parser = new DOMParser();
        let doc = parser.parseFromString(message.payload.html_text, "text/html");
        try {
            let li_elements = doc.getElementsByClassName("d2l-datalist-item d2l-datalist-simpleitem")
            for (const li of li_elements) {
                let inner_item_div = li.firstChild.firstChild.firstChild
                if (inner_item_div.className == "d2l-placeholder") {
                    //lacate elements
                    let task_name_element = inner_item_div.firstChild.firstChild.firstChild
                    let due_date_div = inner_item_div.lastChild
                    //get properties
                    let task_name = task_name_element.innerText
                    let link = null
                    let due_date = null
                    if (task_name_element.className == "d2l-link") {
                        link = task_name_element.href
                    }
                    if (due_date_div.className == "d2l-placeholder d2l-placeholder-live") {
                        let due_date_span = due_date_div.getElementsByClassName("d2l-textblock")[0]
                        if (due_date_span.firstChild.textContent == "Due ") {
                            due_date = due_date_span.lastChild.innerText
                        }
                    }
                }
            }
        } catch (error) {}
        sendResponse(task_list);
    }
    return true; // needed if response is asynchronous
});
