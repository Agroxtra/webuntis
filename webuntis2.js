/**
 * Created by eliaslipp on 03.05.16.
 * desc: a webuntis api which connects with XMLHttpRequests to the webuntis json api,
 *       filters your lessons for the current day out
 */

init("username", "password", "school"); //change it to your username, password and school

function init(user, password, school) {
    var unusedSubjects = ["EUN", "ROB"];
    var groupList = [
        "NVS1_3BHIF_2",
        "NVS1_3BHIF",
        "GGP_3BHIF",
        "RK_3BHIF",
        "POS1_3BHIF",
        "DBI1_3BHIF",
        "DBI1_3BHIF_2",
        "POS1_3BHIF_2"
    ];
    var sessionId;
    var date = getDate(); //use the current date in the used format

    //Log in and get the session id
    sessionId = sendRequest("authenticate", {
        "user": user,
        "password": password,
        "client": "CLIENT" //Client Name
    }, false).sessionId;

    //get the timetable of the week with session id and sort it by startTime
    var result = sendRequest("getTimetable", {
        "options": {
            "startDate": date,
            "endDate": date,
            "element": {
                "id": 291,
                "type": 1
            },
            "showStudentgroup": true,
            "showLsText": true,
            "showLsNumber": true,
            "showInfo": true,
            "klasseFields": ["id", "name", "longname", "externalkey"],
            "teacherFields": ["id", "name"]
        }
    }, true).sort(function (a, b) {
        if (a.startTime > b.startTime)
            return 1; //bigger
        else if (a.startTime < b.startTime)
            return -1; //smaller
        else
            return 0; //the same
    });

    var subjects = sendRequest("getSubjects", {}, true); //get the subject names

    //get the substitutions
    var subs = sendRequest("getSubstitutions", {
        "startDate": date, //the same date because I only want to get it of the current date
        "endDate": date,
        "departmentId": 0
    }, true);

    //filter the necessery subs out
    var substitions = [];

    for (var i = 0; i < subs.length; i++) {
        if (subs[i].lstype != "oh" && subs[i].kl[0].name == "3BHIF") {
            substitions.push(subs[i]);
        }
    }

    //logout
    sendRequest("logout", {}, true);
    sessionId = null;

    //replace the timetable with subs
    result = changeToSubs(substitions, result);

    var array = [];

    //connect the timetable and subjects by each id
    for (var i = 0; i < result.length; i++) {
        for (var j = 0; j < subjects.length; j++) {
            if (subjects[j].id == result[i].su[0].id && usedSubject(subjects[j])) {
                array.push({
                    name: subjects[j].name + result[i].state,
                    startTime: result[i].startTime,
                    endTime: result[i].endTime
                });
            }
        }
    }

    return array;

    function sendRequest(method, params, sendId) {
        //define the options
        var options = {
            "id": "ID", //the id doesnt matter
            "method": method,
            "params": params,
            "jsonrpc": 2.0
        };

        //send an request to the server
        var xhttp = new XMLHttpRequest();
        if (!sendId)
            xhttp.open("POST", "https://nete.webuntis.com/WebUntis/jsonrpc.do?school=" + school, false);
        else
            xhttp.open("POST", "https://nete.webuntis.com/WebUntis/jsonrpc.do" + ";jsessionid=" + sessionId + "?school=" + school, false); //if
        xhttp.setRequestHeader("Content-Type", "application/json-rpc;charset=UTF-8");
        xhttp.send(JSON.stringify(options));
        return JSON.parse(xhttp.responseText).result;
    }

    //get the current date in the used format
    function getDate() {
        var date = (new Date()).getFullYear() + '';
        if ((new Date()).getMonth() + 1 < 10)
            date += '0' + ((new Date()).getMonth() + 1);
        else
            date += ((new Date()).getMonth() + 1);
        date += (new Date()).getDate();
        return date;
    }

    //replace the timetable with subs
    function changeToSubs(subs, subjects) {
        var result = [];
        //if the lession is canceled and another one added it wont add the sub twice
        var bool = false;

        for (var i = 0; i < subjects.length; i++) {
            for (var j = 0; j < subs.length; j++) {
                //check if it is the same lesson (by starting time)
                if (subs[j].startTime == subjects[i].startTime) {
                    //check which substition it is
                    switch (subs[j].type) {
                        case "cancel": //lesson canceled
                            bool = true;
                            break;
                        case "add": //lesson added
                            if (!contains(subs[j], result)) {
                                subs[j].state = "";
                                result.push(subs[j]);
                                bool = true;
                            }
                            break;
                        case "subst": //you have another teacher
                            if (!contains(subjects[i], result)) {
                                subjects[i].state = " (sub)"; //so you can see that it is a sub
                                result.push(subjects[i]);
                                bool = true;
                            }
                            break;
                    }
                }
            }
            if (!bool && (subjects[i].sg == undefined || groups(subjects[i]))) {
                subjects[i].state = "";
                result.push(subjects[i]);
            }
            bool = false;
        }
        //return the hours for the current date
        return result;
    }

    //if array contains this element
    function contains(elem, arr) {
        for (var i = 0; i < arr.length; i++) {
            if (elem.startTime == arr[i].startTime) {
                return true;
            }
        }
        return false;
    }

    //filter the unused subjects out
    function usedSubject(sub) {
        for (var i = 0; i < unusedSubjects.length; i++) {
            if (unusedSubjects[i] == sub.name) return false;
        }
        return true;
    }

    //only use groups in which the student is
    function groups(sub) {
        for (var i = 0; i < groupList.length; i++) {
            if (groupList[i] == sub.sg) return true;
        }
        return false;
    }
};