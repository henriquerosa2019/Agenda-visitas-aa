import { AgendaData, sortVisitsAscending } from '../types';

export const INITIAL_AGENDA: AgendaData = {
  groupName: 'Grupo de Serviços CTO/CIT',
  objective:
    'Levar a mensagem de recuperação aos alcoólicos que ainda sofrem, por meio de visitas regulares às unidades de saúde da região.',
  visits: sortVisitsAscending([
    {
      id: 'sept-14-10h',
      name: 'Clínica da Gávea – Unidade Tijuca',
      addr: 'Rua Dr. Pereira dos Santos, N° 18 – Tijuca',
      date: '2026-09-14',
      time: '10:00',
      slots: ['Danilo', 'Marcio Motta'],
      notes: 'Unidade de internação - Recepção principal',
    },
    {
      id: 'sept-14-16h',
      name: 'Hospital São Francisco na Providência de Deus',
      addr: 'Rua Conde de Bonfim, N° 1030 – Tijuca',
      date: '2026-09-14',
      time: '16:00',
      slots: ['Marcio Motta', '', ''],
      notes: 'Apresentar documento de identificação na portaria',
    },
    {
      id: 'sept-16-19h30',
      name: 'Hospital Casa Menssana',
      addr: 'Rua Marechal Jofre, N° 30 – Grajaú',
      date: '2026-09-16',
      time: '19:30',
      slots: ['', '', ''],
      notes: 'Visita noturna à enfermaria',
    },
    {
      id: 'sept-21-17h',
      name: 'Clínica Evolução',
      addr: 'Rua Mariz e Barros, N° 430 – Praça da Bandeira',
      date: '2026-09-21',
      time: '17:00',
      slots: ['', '', ''],
      notes: 'Reunião de partilha com pacientes',
    },
    {
      id: 'sept-28-16h',
      name: 'Hospital São Francisco na Providência de Deus',
      addr: 'Rua Conde de Bonfim, N° 1030 – Tijuca',
      date: '2026-09-28',
      time: '16:00',
      slots: ['Marcio Motta', '', 'Roberto'],
      notes: 'Encerramento da escala de visitas de setembro',
    },
  ]),
};

export const HOSPITAL_PRESETS = [
  {
    name: 'Clínica da Gávea – Unidade Tijuca',
    addr: 'Rua Dr. Pereira dos Santos, N° 18 – Tijuca',
  },
  {
    name: 'Hospital São Francisco na Providência de Deus',
    addr: 'Rua Conde de Bonfim, N° 1030 – Tijuca',
  },
  {
    name: 'Hospital Casa Menssana',
    addr: 'Rua Marechal Jofre, N° 30 – Grajaú',
  },
  {
    name: 'Clínica Evolução',
    addr: 'Rua Mariz e Barros, N° 430 – Praça da Bandeira',
  },
];
