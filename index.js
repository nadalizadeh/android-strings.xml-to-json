const fs = require("fs");

if (process.argv.length < 4) {
	console.info("Usage:")
	console.info("node index.js /project/values/strings.xml output.json")
	process.exit()
}

// path to project /values/strings.xml
var input_file = process.argv[2];
// output.json
var output_file = process.argv[3];

var xmlData = fs.readFileSync(input_file, 'utf8');

jsonObj = {}

var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
var xmls = new XMLSerializer();

var doc = new DOMParser().parseFromString(
    xmlData
    ,'text/xml');
var nsAttr = doc.documentElement.getAttributeNS('')
console.info(nsAttr)

function replaceParameters(inputStr, paramPrefix = "param") {
	return inputStr.replace(/%([0-9]+)\$([0-9\.]*[fds])/g, (match, p1, p2, p3, offset, string) => {
				if (paramPrefix == "param")
					return "%{" + paramPrefix + p1 + "}"
				else
					return "%{" + paramPrefix + "}"
			})
	.replace(/%%/g, "%")
	.replace(/\\'/g, "'")
	.replace(/\\n/g, "\n");
}

function getSuitableTextFromChildren(theNode) {
	var chNodes = theNode.childNodes;
	var outputText = ''
	for (var i = 0; i < chNodes.length; i++) {
		if (chNodes[i].constructor.name == 'Text') {
			outputText += replaceParameters(chNodes[i].nodeValue)
			// console.info(xmls.serializeToString(arr_items[i]))
		}
		if (chNodes[i].constructor.name == 'Element') {
			if (chNodes[i].tagName == "xliff:g") {
				var xliff_content = chNodes[i].firstChild.nodeValue
				//
				var xliff_id = chNodes[i].getAttribute("id");
				if (xliff_id == undefined || xliff_id == null || xliff_id == "") {
					xliff_id = "param"
				}

				outputText += "<xliff:g>" + replaceParameters(xliff_content, xliff_id) + "</xliff:g>"
			} else if (chNodes[i].tagName == "u") {
				// Ignore the <u> tag
				outputText += getSuitableTextFromChildren(chNodes[i])

				// or reflect the <u> tag
				// outputText += "<u>" + getSuitableTextFromChildren(chNodes[i]) + "</u>"
			} else {
				outputText += chNodes[i]
				console.error("Unknown tagName inside the text: " + chNodes[i].tagName + " Adding the whole block with html tags")
			}
		}
	}

	return outputText.trim()
}

const commentSuffix = "__#"
var lastComment = null;
var items = doc.documentElement.childNodes;
for (var i = 0; i < items.length; i++) {
	var node = items[i];
	if (node.constructor.name == "Comment") {
		// Comments
		lastComment = node.nodeValue.trim()
	}
	if (node.constructor.name == "Element") {
		var name = node.getAttribute("name");

		if (node.tagName == "string") {
			// Plain string tag
			jsonObj[name] = getSuitableTextFromChildren(node);
			if (lastComment) jsonObj[name + commentSuffix] = lastComment;
		} else if (node.tagName == "string-array") {
			// String array tag
			jsonObj[name] = []
			if (lastComment) jsonObj[name + commentSuffix] = lastComment;

			var arr_items = node.childNodes;
			for (var j = 0; j < arr_items.length; j++) {
				if (arr_items[j].tagName == 'item') {
					var value = getSuitableTextFromChildren(arr_items[j])
					jsonObj[name].push(value)
				}
			}
		} else {
			console.info('Unknown: ', node.tagName, name)
			node.parentNode = null;
			console.info(xmls.serializeToString(node))
			console.info(node)
		}

		lastComment = null;
	}
}

fs.writeFileSync(output_file, JSON.stringify(jsonObj, null, 4))
