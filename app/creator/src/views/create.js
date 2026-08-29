import { el, clear } from '../dom.js';
import { createDraftPayload, draftRpcArgs, validateDraft, draftReadiness } from '../model.js';

export function renderCreate(root, ctx, { onCancel, onCreated }) {
  clear(root);

  const error = el('p', { class: 'error form-error', role: 'alert', hidden: true });
  const save = el('button', { type: 'submit', text: 'Save draft' });
  const form = el('form', { class: 'creator-form' });
  form.append(
    formSection('1', 'Identity and fit', 'Tell us what this Journey changes and who it is built to serve.', [
      field('Journey name', input('name', { required: true, maxlength: 100, placeholder: 'e.g. Return to strength training' }), true),
      field('Short description', textarea('short_description', 'One clear sentence participants will see first.', 180)),
      field('What change does it support?', textarea('long_description', 'Describe the transformation, not only the content.', 1200)),
      field('Which Dreams may it fit?', textarea('dream_fit', 'Describe the aspirations this Journey could support.', 700)),
      field('Who is it for?', textarea('audience', 'Starting point, context and relevant experience.', 700)),
      field('Prerequisites', textarea('prerequisites', 'Knowledge, equipment, support or access they need.', 500)),
      field('Intended outcome', textarea('outcome', 'What should a participant be able to do, understand or sustain?', 700)),
      el('div', { class: 'field-pair' }, [
        field('Language', select('language', [['he', 'Hebrew'], ['en', 'English']])),
        field('Cover image URL', input('cover_url', {
          type: 'url', placeholder: 'https://…', pattern: 'https://.*', title: 'Use an HTTPS address.',
        })),
      ]),
    ]),
    formSection('2', 'Shape and effort', 'Set honest expectations. Observed effort can refine these estimates later.', [
      el('div', { class: 'field-grid' }, [
        field('Estimated duration (days)', input('estimated_days', { type: 'number', min: 1, max: 730, inputmode: 'numeric' })),
        field('Weekly effort (minutes)', input('weekly_minutes', { type: 'number', min: 1, max: 10080, inputmode: 'numeric' })),
        field('Difficulty', select('difficulty', [['', 'Not set'], ['gentle', 'Gentle'], ['moderate', 'Moderate'], ['demanding', 'Demanding']])),
      ]),
      field('Discovery tags', input('tags', { placeholder: 'fitness, confidence, restart' }), false, 'Separate tags with commas.'),
    ]),
    formSection('3', 'Journey rules', 'These are safe draft-level rules. The structure builder will later define Milestones and Steps.', [
      el('div', { class: 'field-grid' }, [
        field('Start', select('start_mode', [['flexible', 'Whenever the participant starts']])),
        field('Completion window (days)', input('completion_window_days', { type: 'number', min: 1, max: 730, inputmode: 'numeric' })),
        field('Participant editing', select('edit_policy', [['editable', 'May adapt it'], ['partially_editable', 'May adapt selected parts'], ['locked', 'Fixed as authored']])),
        field('Restart', select('restart_policy', [['allowed', 'May repeat it'], ['once', 'One restart'], ['never', 'No restart']])),
      ]),
      field('What counts as success?', textarea('success_policy', 'Describe the completion principle. Detailed Step thresholds come later.', 700)),
    ]),
    el('section', { class: 'structure-preview' }, [
      el('div', { class: 'structure-icon', text: '↳' }),
      el('div', {}, [
        el('p', { class: 'eyebrow', text: 'Next foundation layer' }),
        el('h3', { text: 'Milestones and Steps' }),
        el('p', { class: 'muted', text: 'The future structure builder will add repetition, dependencies, required Steps, rich media and Coach guidance without changing the draft you create here.' }),
      ]),
      el('span', { class: 'pill', text: 'Coming next' }),
    ]),
    error,
    el('div', { class: 'form-actions' }, [
      el('button', { type: 'button', class: 'ghost', text: 'Cancel', onclick: onCancel }),
      save,
    ]),
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    const values = Object.fromEntries(new FormData(form).entries());
    const payload = createDraftPayload(values, ctx.api.userId);
    const errors = validateDraft(payload);
    if (errors.length) {
      error.textContent = errors.join(' ');
      error.hidden = false;
      form.querySelector('[name="name"]')?.focus();
      return;
    }
    save.disabled = true;
    save.textContent = 'Saving…';
    try {
      const rows = await ctx.api.rpc('creator_create_template_draft', draftRpcArgs(payload));
      const created = Array.isArray(rows) ? rows[0] : rows;
      if (!created?.id) throw new Error('The draft was saved but could not be opened.');
      onCreated(created.id);
    } catch (e) {
      error.textContent = e.message || 'The draft could not be saved. Try again.';
      error.hidden = false;
      save.disabled = false;
      save.textContent = 'Save draft';
    }
  });

  // ── The readiness panel (approved design) ───────────────────────────────
  //
  // It counts the fields §5 requires and nothing else. Deliberately NOT a quality
  // score out of ten: a number invites optimising the number, and a Journey with
  // every field filled can still be a bad Journey. What it can honestly say is
  // which fields a participant would be adopting blind without.
  const readinessTitle = el('h2', {});
  const readinessBar = el('div', { class: 'readiness-bar' }, [el('span', { class: 'readiness-fill' })]);
  const readinessCount = el('p', { class: 'muted small' });
  const readinessPills = el('div', { class: 'pills' });

  const refreshReadiness = () => {
    const values = Object.fromEntries(new FormData(form).entries());
    const state = draftReadiness(values);
    readinessTitle.textContent = state.title;
    readinessBar.firstChild.style.width = `${Math.round(state.ratio * 100)}%`;
    readinessBar.setAttribute('role', 'progressbar');
    readinessBar.setAttribute('aria-valuenow', String(state.done));
    readinessBar.setAttribute('aria-valuemin', '0');
    readinessBar.setAttribute('aria-valuemax', String(state.total));
    readinessBar.setAttribute('aria-label', 'Publishing details completed');
    readinessCount.textContent = `${state.done} of ${state.total} publishing details completed`;
    clear(readinessPills);
    readinessPills.append(el('span', { class: 'pill', text: 'Private' }));
    if (state.missing.length) {
      readinessPills.append(
        el('span', {
          class: 'pill warn',
          title: state.missing.join(', '),
          text: `${state.missing.length} detail${state.missing.length === 1 ? '' : 's'} remaining`,
        }),
      );
    }
  };
  form.addEventListener('input', refreshReadiness);
  form.addEventListener('change', refreshReadiness);

  const readiness = el('aside', { class: 'card readiness' }, [
    el('p', { class: 'eyebrow', text: 'Draft readiness' }),
    readinessTitle,
    readinessBar,
    readinessCount,
    el('h3', { text: 'Structure comes next' }),
    el('p', {
      class: 'muted small',
      text: 'After saving, you’ll add Milestones and Steps without losing this foundation.',
    }),
    readinessPills,
  ]);
  refreshReadiness();

  root.append(
    el('section', { class: 'create-hero' }, [
      el('div', {}, [
        el('p', { class: 'eyebrow', text: 'New Journey Template' }),
        el('h1', { text: 'Start with the promise, not the paperwork' }),
        el('p', { class: 'hero-lede', text: 'Create a private draft for the community. Nothing is published until a later review and publishing flow says it is ready.' }),
      ]),
      el('div', { class: 'draft-badge', text: 'Private draft' }),
    ]),
    el('div', { class: 'create-layout' }, [form, readiness]),
  );
}

function formSection(number, title, description, children) {
  return el('section', { class: 'card form-section' }, [
    el('div', { class: 'form-section-head' }, [
      el('span', { class: 'section-number', text: number }),
      el('div', {}, [el('h2', { text: title }), el('p', { class: 'muted', text: description })]),
    ]),
    ...children,
  ]);
}

function field(label, control, required = false, hint = null) {
  return el('label', { class: 'form-field' }, [
    el('span', { class: 'field-label', text: `${label}${required ? ' *' : ''}` }),
    control,
    hint ? el('small', { class: 'muted', text: hint }) : null,
  ]);
}

function input(name, attrs = {}) {
  return el('input', { name, ...attrs });
}

function textarea(name, placeholder, maxlength) {
  return el('textarea', { name, placeholder, maxlength, rows: 4 });
}

function select(name, options) {
  return el('select', { name }, options.map(([value, label]) => el('option', { value, text: label })));
}
