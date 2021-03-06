import Component from '@glimmer/component';
import {tracked} from '@glimmer/tracking';
import {action} from '@ember/object';

export default class PopoverComponent extends Component {
  @tracked isShowing = false;

  @action
  showAction(element) {
    element.preventDefault();
    this.isShowing = true;
    document.querySelector('body').addEventListener('keyup', this._keyEvent);
  }

  @action
  closeAction(element) {
    element.preventDefault();
    this._removeKeyListener();
    this.isShowing = false;
  }

  willDestroy() {
    this._removeKeyListener();
  }

  @action
  _keyEvent(event) {
    if (event.key != 'Escape') {
      return;
    }

    event.preventDefault();
    this._removeKeyListener();
    this.isShowing = false;
  }

  _removeKeyListener() {
    if (!this.isShowing) {
      return;
    }

    document.querySelector('body').removeEventListener('keyup', this._keyEvent);
  }
}
