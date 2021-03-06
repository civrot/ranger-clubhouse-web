import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | broadcast-simple', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    this.set('config', { });
    this.set('broadcast', { is_simple: 1 } );
    this.set('type', 'emergency');
    await render(hbs`{{broadcast-simple config=config type=type broadcast=broadcast}}`);
    assert.dom('form').exists();
  });
});
