import { Component, Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';

// Signal Forms behaviour that the form model design depends on (ADR-0003). If one of these fails after
// an Angular upgrade, revisit materialize() and the AJV adapter before anything else.

function formWithIssues(model: unknown, issues: { message: string; path: PropertyKey[] }[]) {
  const standard = {
    '~standard': { version: 1 as const, vendor: 'test', validate: () => ({ issues }) },
  };
  return form(signal<any>(model), (root) => validateStandardSchema(root as any, standard as any), {
    injector: TestBed.inject(Injector),
  }) as any;
}

const messages = (field: any): string[] =>
  field()
    .errors()
    .map((e: any) => e.message);

describe('Signal Forms assumptions', () => {
  it('routes Standard Schema issues to nested object and array fields', () => {
    const f = formWithIssues({ a: { b: '' }, list: [{ x: 1 }, { x: 2 }] }, [
      { message: 'b', path: ['a', 'b'] },
      { message: 'x', path: ['list', 1, 'x'] },
    ]);
    expect(messages(f.a.b)).toEqual(['b']);
    expect(messages(f.list[1].x)).toEqual(['x']);
    expect(messages(f.list[0].x)).toEqual([]);
    expect(messages(f)).toEqual([]);
  });

  it('creates no field for an absent or undefined property, and puts its issue on the root', () => {
    for (const model of [{}, { name: undefined }]) {
      const f = formWithIssues(model, [{ message: 'required', path: ['name'] }]);
      expect(f.name).toBeUndefined();
      expect(messages(f)).toEqual(['required']);
    }
  });

  it('creates a field for null, empty and falsy values', () => {
    for (const value of [null, '', 0, false, {}, []]) {
      const f = formWithIssues({ name: value }, [{ message: 'e', path: ['name'] }]);
      expect(messages(f.name)).toEqual(['e']);
    }
  });

  it('throws when an issue path goes through an absent parent', () => {
    expect(() => {
      const f = formWithIssues({}, [{ message: 'e', path: ['a', 'b'] }]);
      f().errors();
    }).toThrow();
  });

  @Component({
    imports: [FormField],
    template: `
      <input id="text" [formField]="f.text" />
      <input id="number" type="number" [formField]="f.number" />
    `,
  })
  class NativeInputs {
    readonly data = signal<any>({ text: null, number: null });
    readonly f = form(this.data) as any;
  }

  it('writes back from a number input bound to null, but not from a text input', async () => {
    const fixture = TestBed.createComponent(NativeInputs);
    await fixture.whenStable();
    const input = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    const type = (id: string, value: string) => {
      input(id).value = value;
      input(id).dispatchEvent(new Event('input'));
    };

    type('text', 'Ann');
    type('number', '42');
    await fixture.whenStable();
    expect(fixture.componentInstance.data()).toEqual({ text: null, number: 42 });

    type('number', '');
    await fixture.whenStable();
    expect(fixture.componentInstance.data()).toEqual({ text: null, number: null });
  });
});
