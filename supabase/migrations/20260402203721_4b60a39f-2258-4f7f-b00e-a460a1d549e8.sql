
-- Reassign presencas from old monitor to new monitor
UPDATE presencas SET registrado_por = '3b4b615f-5b2b-4974-9541-2562a219a27b' WHERE registrado_por = '4eb6bf87-f97a-453a-90ed-9054be67bb21';

-- Reassign presencas from old coordenador to new coordenador
UPDATE presencas SET registrado_por = '65d3f9d6-30bb-4cf2-a645-d35af9130835' WHERE registrado_por = 'a6b55003-154c-49b3-a55a-9f0116994be1';
