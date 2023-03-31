// ==UserScript==
// @name        CX APJ ServiceNow SPN
// @namespace   I314119
// @match       https://test.itsm.services.sap/now/workspace/*
// @match       https://sapexttest.service-now.com/now/workspace/*
// @match       https://sap.service-now.com/now/workspace/*
// @match       https://itsm.services.sap/now/workspace/*
// @version     0.0.1
// @author      I314119
// @description CX APJ ServiceNow Special Handling Notes
//
// @downloadURL https://pages.github.tools.sap/I314119/CX_APJ_SNOW_SHN/CXApjSnowSHN.js
// @supportURL  https://github.tools.sap/I314119/CX_APJ_SNOW_SHN/issues
// @homepageURL https://github.tools.sap/I314119/CX_APJ_SNOW_SHN
// @run-at      document-start
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_listValues
// @grant       GM_openInTab
// @grant       GM_setClipboard
//
// @history     0.0.1   Release: 03.03.2023
// ==/UserScript==
/** Beginning of query-selector-shadow-dom code
 * ================================================================================================================================
 * reference: https://github.com/Georgegriff/query-selector-shadow-dom
 * License Apache-2.0
 */

// normalize.js
function normalizeSelector(sel) {
  // save unmatched text, if any
  function saveUnmatched() {
    if (unmatched) {
      // whitespace needed after combinator?
      if (tokens.length > 0 && /^[~+>]$/.test(tokens[tokens.length - 1])) {
        tokens.push(" ");
      }

      // save unmatched text
      tokens.push(unmatched);
    }
  }

  var tokens = [],
    match,
    unmatched,
    regex,
    state = [0],
    next_match_idx = 0,
    prev_match_idx,
    not_escaped_pattern = /(?:[^\\]|(?:^|[^\\])(?:\\\\)+)$/,
    whitespace_pattern = /^\s+$/,
    state_patterns = [
      /\s+|\/\*|["'>~+\[\(]/g, // general
      /\s+|\/\*|["'\[\]\(\)]/g, // [..] set
      /\s+|\/\*|["'\[\]\(\)]/g, // (..) set
      null, // string literal (placeholder)
      /\*\//g, // comment
    ];
  sel = sel.trim();

  while (true) {
    unmatched = "";

    regex = state_patterns[state[state.length - 1]];

    regex.lastIndex = next_match_idx;
    match = regex.exec(sel);

    // matched text to process?
    if (match) {
      prev_match_idx = next_match_idx;
      next_match_idx = regex.lastIndex;

      // collect the previous string chunk not matched before this token
      if (prev_match_idx < next_match_idx - match[0].length) {
        unmatched = sel.substring(
          prev_match_idx,
          next_match_idx - match[0].length
        );
      }

      // general, [ ] pair, ( ) pair?
      if (state[state.length - 1] < 3) {
        saveUnmatched();

        // starting a [ ] pair?
        if (match[0] === "[") {
          state.push(1);
        }
        // starting a ( ) pair?
        else if (match[0] === "(") {
          state.push(2);
        }
        // starting a string literal?
        else if (/^["']$/.test(match[0])) {
          state.push(3);
          state_patterns[3] = new RegExp(match[0], "g");
        }
        // starting a comment?
        else if (match[0] === "/*") {
          state.push(4);
        }
        // ending a [ ] or ( ) pair?
        else if (/^[\]\)]$/.test(match[0]) && state.length > 0) {
          state.pop();
        }
        // handling whitespace or a combinator?
        else if (/^(?:\s+|[~+>])$/.test(match[0])) {
          // need to insert whitespace before?
          if (
            tokens.length > 0 &&
            !whitespace_pattern.test(tokens[tokens.length - 1]) &&
            state[state.length - 1] === 0
          ) {
            // add normalized whitespace
            tokens.push(" ");
          }

          // case-insensitive attribute selector CSS L4
          if (
            state[state.length - 1] === 1 &&
            tokens.length === 5 &&
            tokens[2].charAt(tokens[2].length - 1) === "="
          ) {
            tokens[4] = " " + tokens[4];
          }

          // whitespace token we can skip?
          if (whitespace_pattern.test(match[0])) {
            continue;
          }
        }

        // save matched text
        tokens.push(match[0]);
      }
      // otherwise, string literal or comment
      else {
        // save unmatched text
        tokens[tokens.length - 1] += unmatched;

        // unescaped terminator to string literal or comment?
        if (not_escaped_pattern.test(tokens[tokens.length - 1])) {
          // comment terminator?
          if (state[state.length - 1] === 4) {
            // ok to drop comment?
            if (
              tokens.length < 2 ||
              whitespace_pattern.test(tokens[tokens.length - 2])
            ) {
              tokens.pop();
            }
            // otherwise, turn comment into whitespace
            else {
              tokens[tokens.length - 1] = " ";
            }

            // handled already
            match[0] = "";
          }

          state.pop();
        }

        // append matched text to existing token
        tokens[tokens.length - 1] += match[0];
      }
    }
    // otherwise, end of processing (no more matches)
    else {
      unmatched = sel.substr(next_match_idx);
      saveUnmatched();

      break;
    }
  }

  return tokens.join("").trim();
}


//querySelectorDeep.js
function querySelectorAllDeep(selector, root = document, allElements = null) {
  return _querySelectorDeep(selector, true, root, allElements);
}

function querySelectorDeep(selector, root = document, allElements = null) {
  return _querySelectorDeep(selector, false, root, allElements);
}

function _querySelectorDeep(selector, findMany, root, allElements = null) {
  selector = normalizeSelector(selector)
  let lightElement = root.querySelector(selector);

  if (document.head.createShadowRoot || document.head.attachShadow) {
    // no need to do any special if selector matches something specific in light-dom
    if (!findMany && lightElement) {
      return lightElement;
    }

    // split on commas because those are a logical divide in the operation
    const selectionsToMake = splitByCharacterUnlessQuoted(selector, ',');

    return selectionsToMake.reduce((acc, minimalSelector) => {
      // if not finding many just reduce the first match
      if (!findMany && acc) {
        return acc;
      }
      // do best to support complex selectors and split the query
      const splitSelector = splitByCharacterUnlessQuoted(minimalSelector
        //remove white space at start of selector
        .replace(/^\s+/g, '')
        .replace(/\s*([>+~]+)\s*/g, '$1'), ' ')
        // filter out entry white selectors
        .filter((entry) => !!entry)
        // convert "a > b" to ["a", "b"]
        .map((entry) => splitByCharacterUnlessQuoted(entry, '>'));

      const possibleElementsIndex = splitSelector.length - 1;
      const lastSplitPart = splitSelector[possibleElementsIndex][splitSelector[possibleElementsIndex].length - 1]
      const possibleElements = collectAllElementsDeep(lastSplitPart, root, allElements);
      const findElements = findMatchingElement(splitSelector, possibleElementsIndex, root);
      if (findMany) {
        acc = acc.concat(possibleElements.filter(findElements));
        return acc;
      } else {
        acc = possibleElements.find(findElements);
        return acc || null;
      }
    }, findMany ? [] : null);


  } else {
    if (!findMany) {
      return lightElement;
    } else {
      return root.querySelectorAll(selector);
    }
  }

}

function findMatchingElement(splitSelector, possibleElementsIndex, root) {
  return (element) => {
    let position = possibleElementsIndex;
    let parent = element;
    let foundElement = false;
    while (parent && !isDocumentNode(parent)) {
      let foundMatch = true
      if (splitSelector[position].length === 1) {
        foundMatch = parent.matches(splitSelector[position]);
      } else {
        // selector is in the format "a > b"
        // make sure a few parents match in order
        const reversedParts = ([]).concat(splitSelector[position]).reverse()
        let newParent = parent
        for (const part of reversedParts) {
          if (!newParent || !newParent.matches(part)) {
            foundMatch = false
            break
          }
          newParent = findParentOrHost(newParent, root);
        }
      }

      if (foundMatch && position === 0) {
        foundElement = true;
        break;
      }
      if (foundMatch) {
        position--;
      }
      parent = findParentOrHost(parent, root);
    }
    return foundElement;
  };

}

function splitByCharacterUnlessQuoted(selector, character) {
  return selector.match(/\\?.|^$/g).reduce((p, c) => {
    if (c === '"' && !p.sQuote) {
      p.quote ^= 1;
      p.a[p.a.length - 1] += c;
    } else if (c === '\'' && !p.quote) {
      p.sQuote ^= 1;
      p.a[p.a.length - 1] += c;

    } else if (!p.quote && !p.sQuote && c === character) {
      p.a.push('');
    } else {
      p.a[p.a.length - 1] += c;
    }
    return p;
  }, { a: [''] }).a;
}

/**
 * Checks if the node is a document node or not.
 * @param {Node} node
 * @returns {node is Document | DocumentFragment}
 */
function isDocumentNode(node) {
  return node.nodeType === Node.DOCUMENT_FRAGMENT_NODE || node.nodeType === Node.DOCUMENT_NODE;
}

function findParentOrHost(element, root) {
  const parentNode = element.parentNode;
  return (parentNode && parentNode.host && parentNode.nodeType === 11) ? parentNode.host : parentNode === root ? null : parentNode;
}

/**
 * Finds all elements on the page, inclusive of those within shadow roots.
 * @param {string=} selector Simple selector to filter the elements by. e.g. 'a', 'div.main'
 * @return {!Array<string>} List of anchor hrefs.
 * @author ebidel@ (Eric Bidelman)
 * License Apache-2.0
 */
function collectAllElementsDeep(selector = null, root, cachedElements = null) {
  let allElements = [];

  if (cachedElements) {
    allElements = cachedElements;
  } else {
    const findAllElements = function (nodes) {
      for (let i = 0, el; el = nodes[i]; ++i) {
        allElements.push(el);
        // If the element has a shadow root, dig deeper.
        if (el.shadowRoot) {
          findAllElements(el.shadowRoot.querySelectorAll('*'));
        }
      }
    }
    if (root.shadowRoot) {
      findAllElements(root.shadowRoot.querySelectorAll('*'));
    }
    findAllElements(root.querySelectorAll('*'));
  }

  return allElements.filter(el => el.matches(selector));
}

/** End of query-selector-shadow-dom code
 * ================================================================================================================================ */

function whenLoaded(selector, activeNode) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      try {
        rootNode = activeNode ? activeNode : querySelectorDeep("sn-workspace-content div")
        var found;
        if (found = querySelectorDeep(selector, rootNode)) {
          clearInterval(interval)
          resolve(found)
        }
      }
      catch (error) {
        // normal if document is still loading
      }
    }, 1000)
  })
}

function appendSendToCalendarButton(element) {
  //<now-button data-index="3" now-id="lhaj8sudlm81" component-id="lhaj8sudlm81" dir="ltr" component-name="_node3_8b35f724db3e7b003da8366af4961909"></now-button>
  const nb = document.createElement("now-button");

  const button = document.createElement("button");
  button.id = "sentToCalendar";
  button.style = `border: none`
  button.title = "Create Event";
  //button.innerHTML = "Create Event";
  button.classList.add('now-button');
  button.classList.add('-secondary');
  button.classList.add('-md');
  button.type="button";

  const slot = document.createElement("slot");
  const span = document.createElement("span");
  span.classList.add('now-line-height-crop');
  span.innerHTML = "Create Event";
  slot.append(span);
  button.append(slot);
  nb.append(button);
  element.append(nb);
}

function httpGet(theUrl)
{
            try{
                var xmlHttp = new XMLHttpRequest();
                xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
                xmlHttp.send( null );
                //console.log(xmlHttp.responseText);
                var obj = JSON.parse(xmlHttp.responseText);
                console.log(obj);
                return obj;
            }catch(err) {
                return [];
            }

}
var customers = [{name:"Airbus Defence and Space GmbH", message:"中国同事请不要处理 Airbus Defence and Space GmbH 的ticket，如果已接请立即remove自己！！！ Colleagues in China, please don't handle ticket from Airbus Defence and Space GmbH, if you are assigned accidentlly, please remove yourself immediately!!!"},
                {name:"McKesson Corporation", message:"中国同事请不要处理 McKesson Corporation 的ticket，如果已接请立即remove自己！！！ McKesson Business Unit Norway (NMD) Only EU support ONLY EU case managers / support engineers are allowed to access customer systems and data."}]
function synctemplates(){
            try{
                let sph = httpGet('https://pages.github.tools.sap/I314119/CX_APJ_SNOW_SHN/SPH.json');
            }catch(err) {
                console.log(err);
            }
        };
whenLoaded("form[class=sn-workspace-form-layout] > sn-form-internal-header-layout")
  .then((rootNode) => {
    whenLoaded("table > tbody > tr >td:nth-child(2)",rootNode)
    .then((rootNode2) => {
       whenLoaded("a",rootNode2)
        .then((rootNode3) => {
          for (let i = 0; i < customers.length; i++) {
            if(rootNode3.textContent.startsWith(customers[i].name)){
              alert(customers[i].message);
              break;
            }
          }
          
        })
        .catch((error) => {
          console.log(error)

        })

    })
    .catch((error) => {
      console.log(error)

    })

  })
  .catch((error) => {
    console.log(error)
  console.log("tao");
  })