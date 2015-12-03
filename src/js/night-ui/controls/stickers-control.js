/* global __DOTJS_TEMPLATE */
/*
 * Photo Editor SDK - photoeditorsdk.com
 * Copyright (c) 2013-2015 9elements GmbH
 *
 * Released under Attribution-NonCommercial 3.0 Unported
 * http://creativecommons.org/licenses/by-nc/3.0/
 *
 * For commercial use, please contact us at contact@9elements.com
 */

import { SDKUtils, Utils, Vector2 } from '../globals'
import Control from './control'

class StickersControl extends Control {
  /**
   * Entry point for this control
   */
  init () {
    this._options = this._ui.options.controlsOptions.stickers || {}

    let controlsTemplate = __DOTJS_TEMPLATE('../templates/operations/stickers_controls.jst')
    this._controlsTemplate = controlsTemplate

    let canvasControlsTemplate = __DOTJS_TEMPLATE('../templates/operations/stickers_canvas.jst')
    this._canvasControlsTemplate = canvasControlsTemplate

    /**
     * The registered stickers
     * @type {Object.<string, class>}
     */
    this._stickers = []
    this._initStickers()
  }

  /**
   * Registers the default stickers
   * @private
   */
  _initStickers () {
    const additionalStickers = this._options.stickers || []
    const replaceStickers = !!this._options.replaceStickers

    const stickers = [
      'glasses-nerd.png',
      'glasses-normal.png',
      'glasses-shutter-green.png',
      'glasses-shutter-yellow.png',
      'glasses-sun.png',
      'hat-cap.png',
      'hat-cylinder.png',
      'hat-party.png',
      'hat-sheriff.png',
      'heart.png',
      'mustache-long.png',
      'mustache1.png',
      'mustache2.png',
      'mustache3.png',
      'pipe.png',
      'snowflake.png',
      'star.png'
    ].map((stickerName) =>
      [
        `stickers/small/${stickerName}`,
        `stickers/large/${stickerName}`
      ]
    )

    if (replaceStickers) {
      this._stickers = additionalStickers
    } else {
      this._stickers = stickers.concat(additionalStickers)
    }
  }

  /**
   * Gets called when this control is activated
   * @override
   */
  _onEnter () {
    this._operationExistedBefore = !!this._ui.operations.sticker
    this._operation = this._ui.getOrCreateOperation('sticker')
    this._initialOptions = this._operation.serializeOptions()

    // Don't render initially
    this._ui.removeOperation('sticker')

    this._onStickerLoad = this._onStickerLoad.bind(this)

    const canvasSize = this._ui.canvas.size

    this._sticker = this._operation.getStickers()[0]
    if (!this._sticker) {
      this._sticker = this._operation.createSticker({
        anchor: new Vector2(0, 0)
      })

      this._scale = this._sticker.getScale().clone()
      this._position = this._sticker.getPosition().clone()
        .multiply(canvasSize)
    } else {
      const stickerImage = this._sticker.getImage()

      this._scale = this._initialSettings.scale.clone()
        .multiply(stickerImage.width, stickerImage.height)
        .multiply(canvasSize)
      this._position = this._initialSettings.position.clone()
        .multiply(canvasSize)
    }

    this._initialSettings = {
      image: this._sticker.getImage(),
      position: this._sticker.getPosition().clone(),
      scale: this._sticker.getScale().clone()
    }

    // Remember zoom level and zoom to fit the canvas
    this._initialZoomLevel = this._ui.canvas.zoomLevel
    this._ui.canvas.zoomToFit()

    // Find DOM elements
    this._container = this._canvasControls.querySelector('.pesdk-canvas-stickers')
    this._stickerImage = this._canvasControls.querySelector('img')
    this._knob = this._canvasControls.querySelector('div.pesdk-knob')

    // Mouse event callbacks bound to the class context
    this._onImageDown = this._onImageDown.bind(this)
    this._onImageDrag = this._onImageDrag.bind(this)
    this._onImageUp = this._onImageUp.bind(this)
    this._onKnobDown = this._onKnobDown.bind(this)
    this._onKnobDrag = this._onKnobDrag.bind(this)
    this._onKnobUp = this._onKnobUp.bind(this)

    this._renderListItems()
    this._handleListItems()
    this._handleImage()
    this._handleKnob()
  }

  /**
   * Renders the stickers on the list item canvas elements
   * @private
   */
  _renderListItems () {
    const canvasItems = this._controls.querySelectorAll('li canvas')
    this._canvasItems = Array.prototype.slice.call(canvasItems)

    for (let i = 0; i < this._canvasItems.length; i++) {
      const canvas = this._canvasItems[i]
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight

      const context = canvas.getContext('2d')
      const image = canvas.getAttribute('data-image')
      const imageEl = document.createElement('img')

      const canvasSize = new Vector2(canvas.width, canvas.height)

      imageEl.addEventListener('load', () => {
        const imageSize = new Vector2(imageEl.width, imageEl.height)
        const newSize = SDKUtils.resizeVectorToFit(imageSize, canvasSize)

        const offset = canvasSize.clone()
          .divide(2)
          .subtract(newSize.clone().divide(2))

        context.drawImage(imageEl,
          0, 0,
          imageSize.x, imageSize.y,
          offset.x, offset.y,
          newSize.x, newSize.y)
      })

      imageEl.src = image
    }
  }

  /**
   * Handles the list item click events
   * @private
   */
  _handleListItems () {
    let listItems = this._controls.querySelectorAll('li')
    this._listItems = Array.prototype.slice.call(listItems)

    // Listen to click events
    for (let i = 0; i < this._listItems.length; i++) {
      let listItem = this._listItems[i]
      const identifier = listItem.getAttribute('data-identifier')
      listItem.addEventListener('click', () => {
        this._onListItemClick(listItem)
      })
      if ((!this._operationExistedBefore && i === 0) ||
          (this._operationExistedBefore &&
          identifier === this._sticker._identifier)) {
        this._onListItemClick(listItem, false)
      }
    }
  }

  /**
   * Resizes and positions the sticker according to the current settings
   * @private
   */
  _applySettings () {
    let ratio = this._stickerSize.y / this._stickerSize.x
    this._scale.y = this._scale.x * ratio

    this._stickerImage.style.width = `${this._scale.x}px`
    this._stickerImage.style.height = `${this._scale.y}px`
    this._container.style.left = `${this._position.x}px`
    this._container.style.top = `${this._position.y}px`
  }

  /**
   * Gets called when the user hits the back button
   * @override
   */
  _onBack () {
    if (this._operationExistedBefore) {
      this._operation = this._ui.getOrCreateOperation('sticker')
      this._operation.set(this._initialSettings)
    } else {
      this._ui.removeOperation('sticker')
    }
    this._ui.canvas.setZoomLevel(this._initialZoomLevel)
  }

  /**
   * Gets called when the done button has been clicked
   * @protected
   */
  _onDone () {
    // Map the position and size options to 0...1 values
    let canvasSize = this._ui.canvas.size
    let position = this._position.clone().divide(canvasSize)
    let scale = this._scale.clone()
      .divide(this._ui.canvas.zoomLevel)
      .divide(this._stickerSize)

    this._ui.canvas.setZoomLevel(this._initialZoomLevel, false)

    // Create a new operation and render it
    this._operation = this._ui.getOrCreateOperation('sticker')
    this._operation.setStickers([this._sticker])
    this._sticker.set({
      image: this._stickerImage,
      position, scale
    })
    this._ui.canvas.render()

    this._ui.addHistory(this._operation,
      this._initialOptions
    , this._operationExistedBefore)
  }

  /**
   * Handles the knob dragging
   * @private
   */
  _handleKnob () {
    this._knob.addEventListener('mousedown', this._onKnobDown)
    this._knob.addEventListener('touchstart', this._onKnobDown)
  }

  /**
   * Gets called when the user clicks the knob
   * @param {Event} e
   * @private
   */
  _onKnobDown (e) {
    e.preventDefault()

    this._initialMousePosition = Utils.getEventPosition(e)
    this._initialSize = this._scale.clone()

    document.addEventListener('mousemove', this._onKnobDrag)
    document.addEventListener('touchmove', this._onKnobDrag)

    document.addEventListener('mouseup', this._onKnobUp)
    document.addEventListener('touchend', this._onKnobUp)
  }

  /**
   * Gets called when the user drags the knob
   * @param {Event} e
   * @private
   */
  _onKnobDrag (e) {
    e.preventDefault()

    let mousePosition = Utils.getEventPosition(e)
    let diff = mousePosition.clone()
      .subtract(this._initialMousePosition)

    let size = this._initialSize.clone()
    let ratio = this._stickerImage.height / this._stickerImage.width
    size.x += diff.x
    size.y = size.x * ratio

    this._scale.copy(size)

    this._applySettings()
    this._highlightDoneButton()
  }

  /**
   * Gets called when the user releases the knob
   * @param {Event} e
   * @private
   */
  _onKnobUp () {
    document.removeEventListener('mousemove', this._onKnobDrag)
    document.removeEventListener('touchmove', this._onKnobDrag)

    document.removeEventListener('mouseup', this._onKnobUp)
    document.removeEventListener('touchend', this._onKnobUp)
  }

  /**
   * Handles the image dragging
   * @private
   */
  _handleImage () {
    this._stickerImage.addEventListener('mousedown', this._onImageDown)
    this._stickerImage.addEventListener('touchstart', this._onImageDown)
  }

  /**
   * Gets called when the user clicks the image
   * @param {Event} e
   * @private
   */
  _onImageDown (e) {
    e.preventDefault()

    this._initialMousePosition = Utils.getEventPosition(e)
    this._initialPosition = this._position.clone()

    document.addEventListener('mousemove', this._onImageDrag)
    document.addEventListener('touchmove', this._onImageDrag)

    document.addEventListener('mouseup', this._onImageUp)
    document.addEventListener('touchend', this._onImageUp)
  }

  /**
   * Gets called when the user drags the image
   * @param {Event} e
   * @private
   */
  _onImageDrag (e) {
    e.preventDefault()

    let mousePosition = Utils.getEventPosition(e)
    let diff = mousePosition.clone()
      .subtract(this._initialMousePosition)

    let position = this._initialPosition.clone()
    position.add(diff)

    this._position.copy(position)

    this._applySettings()
    this._highlightDoneButton()
  }

  /**
   * Gets called when the user releases the image
   * @param {Event} e
   * @private
   */
  _onImageUp () {
    document.removeEventListener('mousemove', this._onImageDrag)
    document.removeEventListener('touchmove', this._onImageDrag)

    document.removeEventListener('mouseup', this._onImageUp)
    document.removeEventListener('touchend', this._onImageUp)
  }

  /**
   * Gets called as soon as the sticker image has been loaded
   * @private
   */
  _onStickerLoad () {
    this._stickerSize = new Vector2(this._stickerImage.width, this._stickerImage.height)
    this._scale = new Vector2(this._stickerImage.width, this._stickerImage.height)

    if (typeof this._position === 'undefined') {
      this._position = new Vector2(0, 0)
    }

    this._applySettings()
    this._stickerImage.removeEventListener('load', this._onStickerLoad)
  }

  /**
   * Gets called when the user clicked a list item
   * @param {Element} item
   * @param {Boolean} manually = true
   * @private
   */
  _onListItemClick (item, manually = true) {
    this._deactivateAllItems()

    const index = item.getAttribute('data-index')
    const stickerPaths = this._stickers[index]
    const stickerPath = this._ui.helpers.assetPath(stickerPaths[1])

    try {
      this._stickerImage.attributes.removeNamedItem('style')
    } catch (e) {}

    this._sticker.setImage(this._stickerImage)
    this._stickerImage.src = stickerPath
    this._stickerImage.addEventListener('load', this._onStickerLoad)

    Utils.classList(item).add('pesdk-controls-item-active')

    if (manually) {
      this._highlightDoneButton()
    }
  }

  /**
   * Deactivates all list items
   * @private
   */
  _deactivateAllItems () {
    for (let i = 0; i < this._listItems.length; i++) {
      let listItem = this._listItems[i]
      Utils.classList(listItem).remove('pesdk-controls-item-active')
    }
  }

  /**
   * The data that is available to the template
   * @type {Object}
   * @override
   */
  get context () {
    let context = super.context
    context.stickers = this._stickers
    return context
  }
}

/**
 * A unique string that identifies this control.
 * @type {String}
 */
StickersControl.prototype.identifier = 'stickers'

export default StickersControl
