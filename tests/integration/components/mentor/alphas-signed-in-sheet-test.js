import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | mentor/alphas-signed-in-sheet', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    this.set('slot', { people: []});
    await render(hbs`{{mentor/alphas-signed-in-sheet slot=slot}}`);

    assert.dom('div').exists();
  });
});
