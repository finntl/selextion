interface selectionBoundaryElements {
  startNode: HTMLElement;
  endNode: HTMLElement;
}
interface selectionBoundaryNodes {
  startNode: Text;
  endNode: Text;
}
interface selectionPosition {
  startOffset: number;
  endOffset: number;
}

interface selectionData extends selectionPosition {
  selectedNodes: HTMLElement[];
}

export default class TextEditor {
  element: HTMLElement;
  menu: HTMLElement | null;
  listeners: { [event: string]: Array<() => void> } = {
    select: [],
  };
  lastSelected: selectionData | null;
  constructor(element: HTMLElement) {
    this.element = element;
    this.menu = null;
    this.lastSelected = null;
    this.element.setAttribute("contenteditable", "true");
    document.addEventListener("mouseup", this.selectionChange);
    this.normaliseContent();
  }
  selectionChange = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    if (this.menu && target !== this.menu && !this.menu.contains(target)) {
      this.lastSelected = this.getSelection();
      this.fireEvent("select");
    } else if (!this.menu) {
      this.lastSelected = this.getSelection();
      this.fireEvent("select");
    } else if (this.lastSelected) {
      this.setSelection(
        this.lastSelected.startOffset,
        this.lastSelected.endOffset
      );
    }
  };

  destroy(): void {
    this.element.removeAttribute("contenteditable");
    document.removeEventListener("mouseup", this.selectionChange);
    this.cleanup();
  }

  on(event: string, callback: () => void[]): void {
    this.listeners[event].push(callback);
  }

  off(event: string, callback: () => void[]): void {
    this.listeners[event] = this.listeners[event].filter(
      (storedCallback) => storedCallback !== callback
    );
  }

  fireEvent(event: string): void {
    this.listeners[event].forEach((callback) => callback());
  }

  normaliseContent(): void {
    [...this.element.querySelectorAll("*")].forEach((element) => {
      [...element.parentElement.childNodes].forEach((child) => {
        if (child.nodeType === 3 && child.textContent.trim()) {
          const wrapper = document.createElement("text-fragment");
          child.replaceWith(wrapper);
          wrapper.appendChild(child);
        } else if (child.nodeType === 3) {
          child.remove();
        }
      });
    });
  }

  getBoundaryNodes(): selectionBoundaryNodes {
    let startNode = window.getSelection().anchorNode as Text;
    let endNode = window.getSelection().focusNode as Text;
    const allElements = [...this.element.querySelectorAll("*")];
    if (
      allElements.indexOf(startNode.parentElement) >
      allElements.indexOf(endNode.parentElement)
    ) {
      startNode = window.getSelection().focusNode as Text;
      endNode = window.getSelection().anchorNode as Text;
    }
    return { startNode, endNode };
  }

  getSelection = (wrapTextPartials = false): selectionData => {
    const startOutOfRange =
      this.getBoundaryNodes().startNode.parentElement !== this.element &&
      !this.element.contains(this.getBoundaryNodes().startNode);
    const endOutOfRange =
      this.getBoundaryNodes().endNode.parentElement !== this.element &&
      !this.element.contains(this.getBoundaryNodes().endNode);
    if (endOutOfRange || startOutOfRange) {
      return null;
    }
    const { startOffset, endOffset } = this.getCursorPosition();
    let startNode = this.getBoundaryNodes().startNode
      .parentElement as HTMLElement;
    let endNode = this.getBoundaryNodes().endNode.parentElement as HTMLElement;
    if (wrapTextPartials && !window.getSelection().isCollapsed) {
      const wrapped = this.wrapTextPartials();
      endNode = wrapped.endNode;
      startNode = wrapped.startNode;
      this.setSelection(startOffset, endOffset);
    }
    const startNodes = this.getStartNodes(startNode, endNode);
    const middleNodes = this.getMiddleNodes();
    const endNodes = this.getEndNodes(startNode, endNode);
    const selectedNodes = [...startNodes, ...middleNodes, ...endNodes];
    return { selectedNodes, startOffset, endOffset };
  };

  wrapTextPartials(): selectionBoundaryElements {
    if (
      window.getSelection().toString() ===
      this.getBoundaryNodes().startNode.textContent
    ) {
      const startNode = this.getBoundaryNodes().startNode
        .parentElement as HTMLElement;
      return { startNode, endNode: startNode };
    }
    if (this.getBoundaryNodes().startNode === this.getBoundaryNodes().endNode) {
      return this.wrapSingleNodeTextSelection();
    }
    return this.wrapMultiNodeTextSelection();
  }

  wrapMultiNodeTextSelection(): selectionBoundaryElements {
    const startPreContent = window
      .getSelection()
      .anchorNode.textContent.substr(0, window.getSelection().anchorOffset);
    const startSelectedContent = window
      .getSelection()
      .anchorNode.textContent.substr(
        window.getSelection().anchorOffset,
        this.getBoundaryNodes().startNode.textContent.length - 1
      );
    const endSelectedContent = window
      .getSelection()
      .focusNode.textContent.substr(0, window.getSelection().focusOffset);
    const endPostContent = window
      .getSelection()
      .focusNode.textContent.substr(
        window.getSelection().focusOffset,
        this.getBoundaryNodes().endNode.textContent.length - 1
      );
    const startContainer = this.getBoundaryNodes().startNode.parentElement;
    startContainer.innerHTML = "";
    const endContainer = this.getBoundaryNodes().endNode.parentElement;
    endContainer.innerHTML = "";
    const startPreNode = document.createElement("text-fragment");
    startPreNode.innerHTML = startPreContent;
    const startSelectedNode = document.createElement("text-fragment");
    startSelectedNode.innerHTML = startSelectedContent;
    const endSelectedNode = document.createElement("text-fragment");
    endSelectedNode.innerHTML = endSelectedContent;
    const endPostNode = document.createElement("text-fragment");
    endPostNode.innerHTML = endPostContent;
    startPreContent && startContainer.appendChild(startPreNode);
    startContainer.appendChild(startSelectedNode);
    endContainer.appendChild(endSelectedNode);
    endPostContent && endContainer.appendChild(endPostNode);
    return { startNode: startSelectedNode, endNode: endSelectedNode };
  }

  wrapSingleNodeTextSelection(): selectionBoundaryElements {
    const startText = window
      .getSelection()
      .anchorNode.textContent.substr(0, window.getSelection().anchorOffset);
    const middleText = window
      .getSelection()
      .anchorNode.textContent.substr(
        window.getSelection().anchorOffset,
        window.getSelection().toString().length
      );
    const endText = window
      .getSelection()
      .anchorNode.textContent.substring(
        startText.length + middleText.length,
        this.getBoundaryNodes().startNode.textContent.length
      );
    const startNode = document.createElement("text-fragment");
    startNode.innerHTML = startText;
    const middleNode = document.createElement("text-fragment");
    middleNode.innerHTML = middleText;
    const endNode = document.createElement("text-fragment");
    endNode.innerHTML = endText;
    const container = this.getBoundaryNodes().startNode.parentElement;
    container.innerHTML = "";
    startText && container.appendChild(startNode);
    container.appendChild(middleNode);
    endText && container.appendChild(endNode);
    return { startNode: middleNode, endNode: middleNode };
  }

  getCommonParent(): HTMLElement {
    let commonParent = this.getBoundaryNodes().startNode.parentElement;
    while (
      !(
        commonParent.contains(this.getBoundaryNodes().startNode) &&
        commonParent.contains(this.getBoundaryNodes().endNode)
      )
    ) {
      commonParent = commonParent.parentElement;
    }
    return commonParent;
  }

  getMiddleNodes(): HTMLElement[] {
    let anchorIndex = 0;
    let focusIndex = 0;
    const candidates = [...this.getCommonParent().children];
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i].contains(this.getBoundaryNodes().startNode)) {
        anchorIndex = i;
      }
      if (candidates[i].contains(this.getBoundaryNodes().endNode)) {
        focusIndex = i;
      }
    }
    if (focusIndex - anchorIndex < 2) return [];
    return candidates.slice(anchorIndex + 1, focusIndex) as HTMLElement[];
  }

  getStartNodes(startNode: HTMLElement, endNode: HTMLElement): HTMLElement[] {
    let comparisonNode = startNode;
    let selected = [comparisonNode];
    if (comparisonNode === endNode) {
      return selected;
    }
    while (comparisonNode.nextElementSibling) {
      selected.push(comparisonNode.nextElementSibling as HTMLElement);
      comparisonNode = comparisonNode.nextElementSibling as HTMLElement;
      if (comparisonNode.nextElementSibling === endNode) {
        return selected;
      }
    }
    while (comparisonNode.parentElement !== this.getCommonParent()) {
      const children = [...comparisonNode.parentElement.children];
      const start = children.indexOf(comparisonNode) + 1;
      selected = [...selected, ...children.slice(start)] as HTMLElement[];
      comparisonNode = comparisonNode.parentElement;
    }

    return selected;
  }

  getEndNodes(startNode: HTMLElement, endNode: HTMLElement): HTMLElement[] {
    let comparisonNode = endNode;
    if ([...comparisonNode.parentElement.children].includes(startNode)) {
      return [];
    }
    let selected = [comparisonNode];
    while (comparisonNode.previousElementSibling) {
      selected.push(comparisonNode.previousElementSibling as HTMLElement);
      comparisonNode = comparisonNode.previousElementSibling as HTMLElement;
      if (comparisonNode.nextElementSibling === startNode) {
        return selected;
      }
    }
    while (comparisonNode.parentElement !== this.getCommonParent()) {
      const children = [...comparisonNode.parentElement.children];
      const end = children.indexOf(comparisonNode);
      selected = [...selected, ...children.slice(0, end)] as HTMLElement[];
      comparisonNode = comparisonNode.parentElement;
    }

    return selected.reverse();
  }

  getTextNodes(): Text[] {
    const directChildren = [...this.element.childNodes].filter(
      (child) => child.nodeType === 3
    );
    let textNodes = [...this.element.querySelectorAll("*")]
      .filter((element) =>
        [...element.childNodes].find((child) => child.nodeType === 3)
      )
      .map((textNode) =>
        [...textNode.childNodes].find((child) => child.nodeType === 3)
      );
    textNodes = [...textNodes, ...directChildren];
    return textNodes as Text[];
  }

  getCursorPosition(): selectionPosition {
    const selection = window.getSelection();
    const textNodes = this.getTextNodes();
    let startIndex = null;
    let endIndex = null;
    const startNode =
      selection.anchorNode.compareDocumentPosition(selection.focusNode) &
      Node.DOCUMENT_POSITION_FOLLOWING
        ? selection.anchorNode
        : selection.focusNode;
    const endNode =
      selection.anchorNode.compareDocumentPosition(selection.focusNode) &
      Node.DOCUMENT_POSITION_FOLLOWING
        ? selection.focusNode
        : selection.anchorNode;
    for (let i = 0; i < textNodes.length; i++) {
      if (
        startIndex === null &&
        (selection.containsNode(textNodes[i]) || startNode === textNodes[i])
      ) {
        startIndex = i;
      }
      if (endNode === textNodes[i]) {
        endIndex = i;
      }
      if (
        endIndex === null &&
        endNode.compareDocumentPosition(textNodes[i]) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ) {
        endIndex = i - 1;
      }
    }
    let startOffset = null;
    let endOffset = null;
    if (
      startNode === selection.anchorNode &&
      !(startNode === endNode && selection.anchorOffset > selection.focusOffset)
    ) {
      startOffset = selection.anchorOffset;
      endOffset = selection.focusOffset;
    } else {
      startOffset = selection.focusOffset;
      endOffset = selection.anchorOffset;
    }
    for (let i = 0; i < startIndex; i++) {
      startOffset += textNodes[i].textContent.length;
    }
    for (let i = 0; i < endIndex; i++) {
      endOffset += textNodes[i].textContent.length;
    }
    return { startOffset, endOffset };
  }
  selectNodes(nodes: HTMLElement[]): void {
    const selection = window.getSelection();
    const range = document.createRange();
    [...nodes].forEach((node) => {
      range.selectNode(node);
    });
    selection.removeAllRanges();
    selection.addRange(range);
  }
  setSelection(start: number, end: number): void {
    const selection = window.getSelection();
    const range = document.createRange();
    const textNodes = this.getTextNodes();
    let count = 0;
    let startNode = null;
    let endNode = null;
    let startOffset = 0;
    let endOffset = 0;
    for (let i = 0; i < textNodes.length; i++) {
      count += textNodes[i].textContent.length;
      if (count >= start && startNode === null) {
        startNode = textNodes[i];
        startOffset = textNodes[i].textContent.length - (count - start);
      }
      if (count >= end && endNode === null) {
        endNode = textNodes[i];
        endOffset = textNodes[i].textContent.length - (count - end);
        break;
      }
    }
    if (endNode === null) {
      endNode = textNodes[textNodes.length - 1];
      endOffset =
        textNodes[textNodes.length - 1].textContent.length - (count - end) - 1;
    }
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    selection.removeAllRanges();
    selection.addRange(range);
    this.lastSelected = this.getSelection();
  }
  insertMenu(content: HTMLElement): void {
    this.menu = document.createElement("div");
    this.menu.style.position = "fixed";
    this.menu.appendChild(content);
    document.body.appendChild(this.menu);
    const menuHeight = this.menu.getBoundingClientRect().height;
    this.positionMenu(this.menu, menuHeight);
    const positionMenu = () => this.positionMenu(this.menu, menuHeight);
    const cleanupMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target !== this.menu && !this.menu.contains(target)) {
        document.removeEventListener("mousedown", cleanupMenu);
        window.removeEventListener("scroll", positionMenu);
        this.menu.remove();
        this.menu = null;
      }
    };
    window.addEventListener("scroll", positionMenu);
    document.addEventListener("mousedown", cleanupMenu);
  }
  positionMenu(menu: HTMLElement, menuHeight: number): void {
    const startElement = this.getBoundaryNodes().startNode.parentElement;
    const endElement = this.getBoundaryNodes().endNode.parentElement;
    const selectionStart = startElement.getBoundingClientRect().top;
    const selectionLeftOffset = startElement.getBoundingClientRect().left;
    const selectionEnd = endElement.getBoundingClientRect().bottom;
    menu.style.left = `${selectionLeftOffset}px`;
    if (selectionStart > menuHeight) {
      menu.style.top = `${selectionStart - menuHeight}px`;
    } else if (window.innerHeight - selectionEnd > menuHeight) {
      menu.style.top = `${selectionEnd}px`;
    } else {
      menu.style.top = "0";
    }
  }
  cleanup(): void {
    while (this.element.querySelector("text-fragment")) {
      const fragment = this.element.querySelector("text-fragment");
      const fragmentOuter = fragment.cloneNode() as HTMLElement;
      if (
        fragmentOuter.outerHTML !== "<text-fragment></text-fragment>" ||
        !fragment.childNodes.length
      ) {
        return;
      }
      fragmentOuter.innerHTML = fragment.innerHTML;
      fragment.replaceWith(fragmentOuter.childNodes[0]);
      for (let i = 1; 1 < fragmentOuter.childNodes.length; i++) {
        fragmentOuter.childNodes[i].after(fragmentOuter.childNodes[i - 1]);
      }
    }
    // collates sibling textnodes into single node which avoids unexpected behaviour
    this.element.innerHTML = this.element.innerHTML;
  }
}
