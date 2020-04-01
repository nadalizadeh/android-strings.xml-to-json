const fs = require("fs");
  
var filename = "/path/to/project/values-de/strings.xml";

var xmlData = fs.readFileSync(filename, 'utf8');

jsonObj = {}

var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
var xmls = new XMLSerializer();

var doc = new DOMParser().parseFromString(
    xmlData
    ,'text/xml');
var nsAttr = doc.documentElement.getAttributeNS('')
console.info(nsAttr)

function getSuitableTextFromChildren(theNode) {
	var chNodes = theNode.childNodes;
	var outputText = ''
	for (var i = 0; i < chNodes.length; i++) {
		if (chNodes[i].constructor.name == 'Text') {
			outputText += chNodes[i].nodeValue
			// console.info(xmls.serializeToString(arr_items[i]))
		}
		if (chNodes[i].constructor.name == 'Element') {
			if (chNodes[i].tagName == "xliff:g") {
				var xliff_content = chNodes[i].firstChild.nodeValue
				if (xliff_content.includes('%')) {
					var content_elements = xliff_content.match(/%([0-9]+)\$(.*[fds])(.*)/) // sample: "%1$dh"
					var extra = (content_elements && content_elements.length > 3) ? content_elements[3] : ""
					var xliff_id = node.getAttribute("id");
					if (xliff_id == undefined || xliff_id == null || xliff_id == "") {
						xliff_id = "param" + (xliff_content[1] || "")
					}
					outputText += "{%" + xliff_id + "}" + extra
				} else {
					outputText += xliff_content
				}
			} else if (chNodes[i].tagName == "u") {
				outputText += "<u>" + getSuitableTextFromChildren(chNodes[i]) + "</u>"
			} else {
				console.error("Unknown tagName inside the text: " + chNodes[i].tagName)
			}
		}
	}

	return outputText.trim()
}

const commentSuffix = "_#"
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

fs.writeFileSync('output.json', JSON.stringify(jsonObj, null, 4))
