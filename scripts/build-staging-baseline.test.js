import { buildBaseline, validateSchemaDump } from './build-staging-baseline.js';

describe('staging schema baseline builder', () => {
  test('rejects a dump containing table data', () => {
    expect(() => validateSchemaDump('COPY public.pacientes (id) FROM stdin;'))
      .toThrow('The schema dump must not contain table data');
  });

  test('removes Supabase-managed schemas from the baseline', () => {
    const output = buildBaseline([
      '--',
      '-- Name: pacientes; Type: TABLE; Schema: public; Owner: -',
      '--',
      'CREATE TABLE public.pacientes (id_paciente integer);',
      '--',
      '-- Name: objects; Type: TABLE; Schema: storage; Owner: -',
      '--',
      'CREATE TABLE storage.objects (id uuid);',
    ].join('\n'));

    expect(output).toContain('CREATE TABLE public.pacientes');
    expect(output).not.toContain('CREATE SCHEMA public');
    expect(output).not.toContain('storage.objects');
  });
});
