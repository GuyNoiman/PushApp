/**
 * The coach explaining itself (technical mode, 2026-08-27).
 *
 * What is proved here is the contract, not the wording — the sentences will change and should not
 * be pinned. The contract is: OFF by default and silent; ON and it says which domain was read, which
 * expert that selected, why the diagnosis did or did not run and what it concluded; and — the one
 * that would be a real defect — the commentary NEVER enters the conversation the model reads.
 */
import { MockLlmClient } from '../../llm/LlmClient';
import { CoachOrchestrator } from '../CoachOrchestrator';

const goalMock = (domain: string, kind: 'recurring' | 'process' = 'process', title = 'find a new job') =>
  new MockLlmClient((req) => (req.json ? JSON.stringify({ goals: [{ title, kind, domain }] }) : 'UNUSED'));

/** Every note produced across a whole interview. */
async function notesFor(domain: string, technical: boolean) {
  const orchestrator = new CoachOrchestrator({ llm: goalMock(domain) });
  orchestrator.setTechnicalMode(technical);
  orchestrator.start();
  let turn = await orchestrator.triage('find a new job');
  const notes = [...(turn.technicalNotes ?? [])];
  while (!turn.done) {
    turn = await orchestrator.selectOption(0);
    notes.push(...(turn.technicalNotes ?? []));
  }
  return notes;
}

describe('technical mode, in the orchestrator', () => {
  it('is OFF by default and says nothing at all', async () => {
    const orchestrator = new CoachOrchestrator({ llm: goalMock('career') });
    expect(orchestrator.isTechnicalMode()).toBe(false);
    expect(await notesFor('career', false)).toEqual([]);
  });

  it('explains what it understood, which expert that chose, and what bounds the plan', async () => {
    const notes = (await notesFor('career', true)).join('\n---\n');
    expect(notes).toContain('Understanding the opening message');
    expect(notes).toContain('Goal activated');
    expect(notes).toContain('Expert selected');
    expect(notes).toContain('Interview assembled');
    expect(notes).toContain('Constraints the plan is built inside');
  });

  it('says WHY the diagnosis did not run, which is the question most often asked of it', async () => {
    // A non-career domain has no authored tree. Silence here would read as "the diagnosis ran and
    // found nothing", which is a different and much worse thing to believe.
    const notes = (await notesFor('body_image', true)).join('\n');
    expect(notes).toContain('Diagnosis skipped');
    expect(notes).toContain('no authored diagnosis tree');
  });

  it('can be turned off mid-conversation, and goes quiet immediately', async () => {
    const orchestrator = new CoachOrchestrator({ llm: goalMock('career') });
    orchestrator.setTechnicalMode(true);
    orchestrator.start();
    const first = await orchestrator.triage('find a new job');
    expect(first.technicalNotes?.length).toBeGreaterThan(0);

    orchestrator.setTechnicalMode(false);
    const next = await orchestrator.selectOption(0);
    expect(next.technicalNotes).toBeUndefined();
  });

  it('never reports the same note twice', async () => {
    const orchestrator = new CoachOrchestrator({ llm: goalMock('career') });
    orchestrator.setTechnicalMode(true);
    orchestrator.start();
    const first = await orchestrator.triage('find a new job');
    const second = await orchestrator.selectOption(0);
    for (const note of first.technicalNotes ?? []) {
      expect(second.technicalNotes ?? []).not.toContain(note);
    }
  });

  it('NEVER puts its commentary into the conversation the model reads', async () => {
    // The defect this guards against: the coach reading its own notes back as though the user had
    // said them, on the next understanding call.
    const orchestrator = new CoachOrchestrator({ llm: goalMock('career') });
    orchestrator.setTechnicalMode(true);
    orchestrator.start();
    let turn = await orchestrator.triage('find a new job');
    const notes = [...(turn.technicalNotes ?? [])];
    while (!turn.done) {
      turn = await orchestrator.selectOption(0);
      notes.push(...(turn.technicalNotes ?? []));
    }
    expect(notes.length).toBeGreaterThan(0);

    const transcript = JSON.stringify(turn.state);
    for (const note of notes) {
      // The note's own title is enough of a fingerprint; the whole block would be too.
      expect(transcript).not.toContain(note.split('\n')[0]);
    }
  });

  it('changes nothing about what the coach decides', async () => {
    // The commentary is a description of a decision, never an input to one. Same questions, same
    // spec, mode on or off.
    const run = async (technical: boolean) => {
      const orchestrator = new CoachOrchestrator({ llm: goalMock('career') });
      orchestrator.setTechnicalMode(technical);
      orchestrator.start();
      let turn = await orchestrator.triage('find a new job');
      const ids: string[] = [];
      while (!turn.done) {
        if (turn.question) ids.push(turn.question.id);
        turn = await orchestrator.selectOption(0);
      }
      return { ids, spec: turn.goalSpec };
    };
    const off = await run(false);
    const on = await run(true);
    expect(on.ids).toEqual(off.ids);
    expect(on.spec).toEqual(off.spec);
  });
});
