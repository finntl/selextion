## Use cases

Selextion provides a consistent experience based upon the contenteditable API, but handles all the edge cases for you.
Simply listen to the event to determine when a user has selected a section of text, and inject your menu into the positioned container.
Note that for simplicity, the menu container position is based upon the element containing the selected text, rather than the cursor position itself
(although if cursor based positioning would be useful, let me know so I can add it to future releases!).
When the user clicks a button you can use the selextion API to wrap the selection in nodes (by passing the true flag to the getSelection method).
You can then manipulate the returned nodes in any manner that you wish, they're regular HTML elements so styling / appending classes requires no special consideration.

## Quickstart

Simply import the javascript file in to your project!

## API

After installing dev dependancies run "npm run demo" to see some example setups in action, the API could not be more simple, so that one example covers everything you'll need! If you modify the content of your editable element dynamically, you can use the "lastSelected" property to call the "setSelection" method and restore the position of the cursor. Alternativey you can use the selectNodes method to directly select the nodes ypu inserted.
