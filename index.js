/**
 * @author Yiğit Can YILMAZ
 * @date 12.08.2022
 */
/*  EXISTENCE TRUTH TABLE

    remote  local   xlsx    result      (0: not exist, 1: exist)
    -------------------------------
    0       0       0       NoChange
    0       0       1       XlsxAdded
    0       1       0       Removed
    0       1       1       Removed
    1       0       0       RemoteAdded
    1       0       1       XlsxAdded
    1       1       0       Removed
    1       1       1       NoChange

################################################
    CHANGE TRUTH TABLE

    remote  local   xlsx    result      (0: not changed, 1 changed)
    -------------------------------
    0       0       0       NoChange
    0       0       1       XlsxChanged
    1       0       0       RemoteChanged
    1       0       1       XlsxChanged
    1       1       1       XlsxChanged
*/

const { Console } = require('console');
const fs = require('fs');
const XLSX = require("xlsx");
var RCU = require("./rcu.js");
const TABLES_FOLDER_PATH = 'tables'
const xlsx_file_path = 'tables/Localizable.xlsm'
const MAX_COL_WIDTH = 80
const KEY_TEMPLATE_VERSION = "templateVersion"
const FILEPATH_CACHE = 'cache.json'
const FILEPATH_PREFIX_LOCALIZABLE = 'localizable/Localizable_'
const KEY_PREFIX_LOCALIZABLE = 'localizable_'
const KEY_OF_KEYS = "Key"
const KEY_OF_VALUES = "Value"
const KEY_OF_SUPPORTED_LANGUAGES = "supportedLanguages"
const LOCALIZABLE_FOLDER_PATH = 'localizable'
var languageCodes = [];
const KeyStatus = {
    Removed: 0,
    RemoteAdded: 1,
    XlsxAdded: 2,
    RemoteChanged: 3,
    XlsxChanged: 4,
    NoChange: 5
}

if(isFileExist(FILEPATH_CACHE)){
    languageCodes = getCache()[KEY_OF_SUPPORTED_LANGUAGES];
}

function init(){
    ensureFilesCreated();
    initFirebase()
    RCU.getTemplateWithoutSaving().then(data => {
        if (isNewVersionExist(data)){
            updateXlsx(data)
            console.log("Sync Successful. Workbook Up to Date. ✅");
        } else {
            console.log("No New Version. Workbook Up to Date ✅");
        }

    });
    
}

function initFirebase(){
    try {
        RCU.initFirebaseApp("main");
    } catch (err) {
        console.log("Already initialized: FirebaseApp ✅");
    }
}

function publishTemplate(){
    initFirebase();
    ensureFilesCreated();
    RCU.getTemplateWithoutSaving().then(data => {
        if (isNewVersionExist(data)){
            console.log("New Version Exist. 👀");
            console.log("Changes Merged with New Version. ✅");
        }
        var mergedTemplate = getMergedLocalizable(data);
        var updatedTemplate = data;
        for(i in languageCodes){
            var languageCode = languageCodes[i];
            updatedTemplate.parameters[KEY_PREFIX_LOCALIZABLE+languageCode].defaultValue.value = JSON.stringify(mergedTemplate.parameters[KEY_PREFIX_LOCALIZABLE+languageCode].defaultValue.value);
        }; 
        
        RCU.publishEditedTemplate(updatedTemplate).then(result => {
            console.log("Published Successfully 🚀");
            init();
        });
    });
    
}


function getCache(){
    return JSON.parse(fs.readFileSync(FILEPATH_CACHE, 'utf8'));
}

function updateCache(data){
    fs.writeFileSync(FILEPATH_CACHE, beautifyJson(data), 'utf8');
}

function updateXlsx(template){
    ensureFilesCreated();
    var workbook = XLSX.readFile(xlsx_file_path);
    for (var i in languageCodes){
        var languageCode = languageCodes[i];
        var parameter = template.parameters[KEY_PREFIX_LOCALIZABLE+languageCode];
        if (parameter !== undefined){
            updateWorkbookPage(workbook, languageCode, parameter);
            updateTemplateVersionCache(template.version.versionNumber);
        }

    }
    
}

function updateWorkbookPage(workbook, languageCode, parameter) {
    var localizable = parameter.defaultValue.value;
    fs.writeFileSync(FILEPATH_PREFIX_LOCALIZABLE + languageCode + '.json', beautifyJson(JSON.parse(localizable)), 'utf8');
    var localizableData = jsonToArray(escape(JSON.parse(localizable)));
    if (workbook.SheetNames.includes(languageCode)){
        var nonRelevantData = XLSX.utils.sheet_to_json(workbook.Sheets[languageCode]).filter(it => it[KEY_OF_KEYS] === undefined);
        nonRelevantData.forEach(element => {
            localizableData.push(element)
        });
        var sheet = XLSX.utils.json_to_sheet(localizableData);
        sheet["!cols"] = [ { wch: MAX_COL_WIDTH } ];
        workbook.Sheets[languageCode] = sheet;
    } else {
        var sheet = XLSX.utils.json_to_sheet(jsonToArray(localizable));
        sheet["!cols"] = [ { wch: MAX_COL_WIDTH } ];
        XLSX.utils.book_append_sheet(workbook, sheet, languageCode, { origin: "A1" });
    }
    XLSX.writeFile(workbook, xlsx_file_path);
}

function updateTemplateVersionCache(newVersion){
    var cache = getCache();
    cache[KEY_TEMPLATE_VERSION] = newVersion;
    updateCache(cache);
}

function beautifyJson(json){
    
    return JSON.stringify(json, null, 2)
}

function isJSON(str) {
    try {
        return (JSON.parse(str) && !!str);
    } catch (e) {
        return false;
    }
}

function jsonToArray(json){
    var result = [];
    for(const [key, value] of Object.entries(json)){
        var obj = {};
        obj[KEY_OF_KEYS] = key;
        obj[KEY_OF_VALUES] = value;
        result.push(obj);
    };
    return result;
}

function escape(json){
    var result = {};
    for(const [key, value] of Object.entries(json)){
        result[key] = value.replace("\n", "\\n").replace("\"", "\\\"");
    };
    return result;
}

function ensureFilesCreated(){
    if(!isFileExist(FILEPATH_CACHE)){
        var initialCache ={ "templateVersion": "0", "supportedLanguages": ["tr"]}
        updateCache(initialCache);
        languageCodes = getCache()[KEY_OF_SUPPORTED_LANGUAGES];
    }
    fs.mkdirSync(LOCALIZABLE_FOLDER_PATH, { recursive: true })
    languageCodes.forEach(languageCode => {
        var localizationFilePath = FILEPATH_PREFIX_LOCALIZABLE + languageCode + ".json"
        if(!isFileExist(localizationFilePath)){
            fs.writeFileSync(localizationFilePath, "{}", 'utf8');
        }
    })
    
    fs.mkdirSync(TABLES_FOLDER_PATH, { recursive: true })
    if (!isFileExist(xlsx_file_path)){
        var workbook = XLSX.utils.book_new();
    } else {
        var workbook = XLSX.readFile(xlsx_file_path);
    }

    for (var i in languageCodes){
        var languageCode = languageCodes[i];
        if (!workbook.SheetNames.includes(languageCode)){
            XLSX.utils.book_append_sheet(workbook, [[KEY_OF_KEYS, KEY_OF_VALUES]], languageCode, { origin: "A1" })
        }
    }
    XLSX.writeFile(workbook, xlsx_file_path);
}

function isFileExist(filePath){
    try {
        var fd = fs.openSync(filePath);
        var stat = fs.fstatSync(fd);
        fs.close(fd, (err) => {});
        if (stat.isFile){
            return true;
        }
        return false;
        
    } catch (error) {
        return false
    }
    
}

function getLocalJson(languageCode) {
    return JSON.parse(fs.readFileSync(FILEPATH_PREFIX_LOCALIZABLE + languageCode + '.json', 'utf8'));
}

function getRemoteJson(template, languageCode) {
    return JSON.parse(template.parameters[KEY_PREFIX_LOCALIZABLE+languageCode].defaultValue.value);
}

function getXlsxJson(languageCode) {
    var xlsxFile = XLSX.readFile(xlsx_file_path);
    return sheetJsonToLocalizableJson(XLSX.utils.sheet_to_json(xlsxFile.Sheets[languageCode]).filter(it => it[KEY_OF_KEYS] !== undefined));
}

function getMergedLocalizable(template){
    var updatedTemplate = template;
    //ensureFilesCreated();
    for (var l in languageCodes){
        var languageCode = languageCodes[l];
        var localJson = getLocalJson(languageCode);
        var remoteJson = getRemoteJson(template, languageCode);
        var xlsxJson = getXlsxJson(languageCode);
        var allKeys = [];
        var mergedObject = {};


        for(const [key, value] of Object.entries(localJson)){
            //languageListLocal.push([i, localJson[i]]);
            if (!allKeys.includes(key)){
                allKeys.push(key);
            }
        };

        for(const [key, value] of Object.entries(remoteJson)){
            //languageListRemote.push([i, remoteJson[i]]);
            if (!allKeys.includes(key)){
                allKeys.push(key);
            }
        };

        for(const [key, value] of Object.entries(xlsxJson)){
            //languageListXlsx.push([i, xlsxJson[i]]);
            if (!allKeys.includes(key)){
                allKeys.push(key);
            }
        };

        allKeys.forEach(i => {
            var difference = getDifferenceWithKey(i, remoteJson, localJson, xlsxJson);
            switch (difference) {
                case KeyStatus.XlsxAdded:
                    mergedObject[i] = xlsxJson[i];
                    break;
            
                case KeyStatus.RemoteAdded:
                    mergedObject[i] = remoteJson[i];
                    break;
            
                case KeyStatus.Removed:
                    //will not add to mergedObject
                    break;
            
                case KeyStatus.RemoteChanged:
                    mergedObject[i] = remoteJson[i];
                    break;
            
                case KeyStatus.XlsxChanged:
                    mergedObject[i] = xlsxJson[i];
                    break;
            
                case KeyStatus.NoChange:
                    mergedObject[i] = xlsxJson [i];
                    break;
            
                default:
                    break;
            };
        });
        updatedTemplate.parameters[KEY_PREFIX_LOCALIZABLE+languageCode].defaultValue.value = mergedObject;
    };
    return updatedTemplate;
  }

function getDifferenceWithKey(key, remoteJson, localJson, xlsxJson){
    var remoteValue = remoteJson[key]
    var localValue = localJson[key]
    var xlsxValue = xlsxJson[key]

    // this statement checks 1-0-0 and 1-0-1 (see: existence truth table)
    if (remoteValue !== undefined && localValue === undefined){
        if (xlsxValue === undefined){ 
            return KeyStatus.RemoteAdded;
        } else { 
            return KeyStatus.XlsxAdded;
        }
    }

    // this statement checks 0-0-1 and 0-1-1  (see: existence truth table)
    if (remoteValue === undefined && xlsxValue !== undefined){
        if (localValue === undefined){  
            return KeyStatus.XlsxAdded;
        } else {
            return KeyStatus.Removed;
        }
    }

    // this statement checks 1-1-0 and 0-1-0  (see: existence truth table)
    if (localValue !== undefined && xlsxValue === undefined){
        if(remoteValue === undefined){
            return KeyStatus.Removed;
        } else {
            return KeyStatus.Removed;
        }
    }

    //this statement checks 1-0-0 and 1-0-1 (see: change truth table)
    if (remoteValue !== localValue){
        if(localValue === xlsxValue){
            return KeyStatus.RemoteChanged;
        } else {
            return KeyStatus.XlsxChanged;
        }
    }

    //this statement checks 0-0-1 (see: change truth table)
    if (remoteValue === localValue && xlsxValue !== localValue){
        return KeyStatus.XlsxChanged;
    }

    return KeyStatus.NoChange;

}

function unescape(json){
    return json.replace("\\n", "\n").replace("\\\"", "\"")
}

function sheetJsonToLocalizableJson(json){
    var result = {};
    for(const [key, value] of Object.entries(json)){
        result[value[KEY_OF_KEYS]] = unescape(value[KEY_OF_VALUES]);
    };
    return result;
    }

    function isNewVersionExist(template){
    var cache = getCache();
    var cachedTemplateVersion = cache.templateVersion;
    if (cachedTemplateVersion === undefined){
        cache[KEY_TEMPLATE_VERSION] = 0;
        cachedTemplateVersion = 0;
    }
    var remoteTemplateVersion = Number(template.version.versionNumber);
    return remoteTemplateVersion>cachedTemplateVersion;
}

const action = process.argv[2];
switch (action) {
    case "fetch":
        console.log("data has been fetching...⏳");
        init();
        break;

    case "publish":
        console.log("publish started. ⏳");
        publishTemplate();
        break;

    default:
        console.log(`Invalid argument: ${action}. Please try "fetch" or "publish".`);
        //init();
        break;
};

module.exports ={
    init, publishTemplate
  }

