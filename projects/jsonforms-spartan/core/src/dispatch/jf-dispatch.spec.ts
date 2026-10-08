import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField } from '@angular/forms/signals';
import {
  isStringControl,
  RuleEffect,
  rankWith,
  uiTypeIs,
  type JsonSchema,
  type UISchemaElement,
} from '@jsonforms/core';
import { JfForm } from '../form/jf-form';
import { injectJfControl } from '../inject/inject-jf-control';
import { injectJfLayout } from '../inject/inject-jf-layout';
import type { JfRendererEntry } from '../registry';
import { JfDispatch } from './jf-dispatch';

@Component({
  selector: 'jf-test-text',
  imports: [FormField],
  template: `
    @if (c.field(); as field) {
      <label [for]="c.id">{{ c.label() }}{{ c.required() ? ' *' : '' }}</label>
      <input [id]="c.id" [formField]="field" [attr.data-path]="c.path()" />
      @if (c.description()) {
        <p class="description">{{ c.description() }}</p>
      }
      @for (error of field().errors(); track $index) {
        <p class="error">{{ error.message }}</p>
      }
      <span class="enabled">{{ c.enabled() }}</span>
    }
  `,
})
class TestTextControl {
  protected readonly c = injectJfControl<string>();
}

@Component({
  selector: 'jf-test-other-text',
  template: `<span class="other">other</span>`,
})
class OtherTextControl {}

@Component({
  selector: 'jf-test-vertical',
  imports: [JfDispatch],
  template: `
    <div class="vertical" [attr.data-label]="layout.label()" [attr.data-enabled]="layout.enabled()">
      @for (element of layout.elements(); track $index) {
        <jf-dispatch [uischema]="element" [schema]="layout.schema()" [path]="layout.path()" />
      }
    </div>
  `,
})
class TestVerticalLayout {
  protected readonly layout = injectJfLayout();
}

const testRenderers: JfRendererEntry[] = [
  { tester: rankWith(1, isStringControl), renderer: TestTextControl },
  { tester: rankWith(1, uiTypeIs('VerticalLayout')), renderer: TestVerticalLayout },
  { tester: rankWith(1, uiTypeIs('Group')), renderer: TestVerticalLayout },
];

const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Full name', description: 'As on your passport' },
    nickname: { type: 'string' },
    locked: { type: 'boolean' },
    address: {
      type: 'object',
      properties: { city: { type: 'string' } },
      required: ['city'],
    },
  },
  required: ['name'],
};

@Component({
  imports: [JfForm],
  template: `
    <jf-form [schema]="schema" [uischema]="uischema()" [renderers]="renderers()" [(data)]="data" />
  `,
})
class Host {
  readonly schema = schema;
  readonly uischema = signal<UISchemaElement | undefined>(undefined);
  readonly renderers = signal<JfRendererEntry[]>(testRenderers);
  readonly data = signal<unknown>({});
  readonly jf = viewChild.required(JfForm);
}

const control = (scope: string, extra: object = {}): UISchemaElement =>
  ({ type: 'Control', scope, ...extra }) as UISchemaElement;

const lockedIs = (value: boolean) => ({
  scope: '#/properties/locked',
  schema: { const: value },
});

async function setup(uischema?: UISchemaElement, data: unknown = {}) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.uischema.set(uischema);
  fixture.componentInstance.data.set(data);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const input = (path: string) => el.querySelector<HTMLInputElement>(`input[data-path="${path}"]`);
  return { fixture, host: fixture.componentInstance, el, input };
}

describe('JfDispatch', () => {
  it('renders the generated layout with a control per string property', async () => {
    const { el, input } = await setup();
    expect(el.querySelector('.vertical')).not.toBeNull();
    expect(input('name')).not.toBeNull();
    expect(input('nickname')).not.toBeNull();
    // No renderer for the boolean and the object in this test set.
    expect(el.textContent).toContain('No applicable renderer found.');
  });

  it('gives controls their label, required flag, description and a linked id', async () => {
    const { el, input } = await setup({
      type: 'VerticalLayout',
      elements: [control('#/properties/name'), control('#/properties/nickname')],
    } as UISchemaElement);
    const labels = [...el.querySelectorAll('label')];
    expect(labels.map((label) => label.textContent)).toEqual(['Full name *', 'Nickname']);
    expect(labels[0].htmlFor).toBe(input('name')!.id);
    expect(input('name')!.id).not.toBe(input('nickname')!.id);
    expect(el.querySelector('.description')?.textContent).toBe('As on your passport');
  });

  it('uses the label from the UI schema', async () => {
    const { el } = await setup(control('#/properties/nickname', { label: 'Alias' }));
    expect(el.querySelector('label')?.textContent).toBe('Alias');
  });

  it('binds nested scopes to the field at their data path', async () => {
    const { fixture, host, el, input } = await setup(
      control('#/properties/address/properties/city'),
      {
        address: { city: 'Padova' },
      },
    );
    expect(input('address.city')!.value).toBe('Padova');
    expect(el.querySelector('label')?.textContent).toBe('City *');

    input('address.city')!.value = 'Rome';
    input('address.city')!.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(host.data()).toEqual({ address: { city: 'Rome' } });
  });

  it('shows the validation errors routed to the field', async () => {
    const { fixture, el, input } = await setup(control('#/properties/name'));
    expect(el.querySelector('.error')?.textContent).toBe("must have required property 'name'");

    input('name')!.value = 'Ann';
    input('name')!.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el.querySelector('.error')).toBeNull();
  });

  it('picks the renderer with the highest rank, and the first one on a tie', async () => {
    const { fixture, host, el } = await setup(control('#/properties/name'));
    host.renderers.set([
      ...testRenderers,
      { tester: rankWith(1, isStringControl), renderer: OtherTextControl },
    ]);
    await fixture.whenStable();
    expect(el.querySelector('.other')).toBeNull();

    host.renderers.set([
      ...testRenderers,
      { tester: rankWith(2, isStringControl), renderer: OtherTextControl },
    ]);
    await fixture.whenStable();
    expect(el.querySelector('.other')).not.toBeNull();
  });

  it('does not render an element hidden by a rule, and shows it again when the data changes', async () => {
    const { fixture, host, input } = await setup(
      {
        type: 'VerticalLayout',
        elements: [
          control('#/properties/nickname', {
            rule: { effect: RuleEffect.HIDE, condition: lockedIs(true) },
          }),
        ],
      } as UISchemaElement,
      { locked: true },
    );
    expect(input('nickname')).toBeNull();

    host.data.set({ locked: false });
    await fixture.whenStable();
    expect(input('nickname')).not.toBeNull();
  });

  it('disables a control through Signal Forms when its rule says so', async () => {
    const { fixture, host, el, input } = await setup(
      control('#/properties/nickname', {
        rule: { effect: RuleEffect.DISABLE, condition: lockedIs(true) },
      }),
      { locked: true },
    );
    expect(input('nickname')!.disabled).toBe(true);
    expect(el.querySelector('.enabled')?.textContent).toBe('false');
    expect((host.jf().form() as any).nickname().disabled()).toBe(true);

    host.data.set({ locked: false });
    await fixture.whenStable();
    expect(input('nickname')!.disabled).toBe(false);
    expect(el.querySelector('.enabled')?.textContent).toBe('true');
  });

  it('disables every control inside a layout disabled by a rule', async () => {
    const { el, input } = await setup(
      {
        type: 'VerticalLayout',
        elements: [
          {
            type: 'Group',
            label: 'Contact',
            rule: { effect: RuleEffect.ENABLE, condition: lockedIs(false) },
            elements: [control('#/properties/name'), control('#/properties/nickname')],
          },
        ],
      } as UISchemaElement,
      { locked: true },
    );
    expect(input('name')!.disabled).toBe(true);
    expect(input('nickname')!.disabled).toBe(true);
    const group = el.querySelector('[data-label="Contact"]');
    expect(group?.getAttribute('data-enabled')).toBe('false');
  });

  it('disables the children of a disabled object control', async () => {
    const { host } = await setup(
      {
        type: 'VerticalLayout',
        elements: [
          control('#/properties/address', {
            rule: { effect: RuleEffect.DISABLE, condition: lockedIs(true) },
          }),
        ],
      } as UISchemaElement,
      { locked: true },
    );
    expect((host.jf().form() as any).address.city().disabled()).toBe(true);
  });
});
