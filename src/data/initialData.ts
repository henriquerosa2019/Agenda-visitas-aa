import { AgendaData, sortVisitsAscending } from '../types';

export const INITIAL_AGENDA: AgendaData = {
  groupName: 'Grupo de Serviços CTO/CIT',
  objective:
    'Levar a mensagem de recuperação aos alcoólicos que ainda sofrem, por meio de visitas regulares às unidades de saúde da região.',
  visits: sortVisitsAscending([
    {
      id: 'visit-2026-11-09-10h',
      name: 'Clínica da Gávea – Unidade Tijuca',
      addr: 'Rua Dr. Pereira dos Santos, N° 18 – Tijuca',
      date: '2026-11-09',
      time: '10:00',
      slots: ['Danilo', '', ''],
      notes: 'Unidade de internação - Recepção principal',
    },
    {
      id: 'visit-2026-11-09-16h',
      name: 'Hospital São Francisco na Providência de Deus',
      addr: 'Rua Conde de Bonfim, N° 1030 – Tijuca',
      date: '2026-11-09',
      time: '16:00',
      slots: ['', '', ''],
      notes: 'Apresentar documento de identificação na portaria',
    },
    {
      id: 'visit-2026-11-16-17h',
      name: 'Clínica Evolução',
      addr: 'Rua Mariz e Barros, N° 430 – Praça da Bandeira',
      date: '2026-11-16',
      time: '17:00',
      slots: ['', '', ''],
      notes: 'Reunião de partilha com pacientes',
    },
    {
      id: 'visit-2026-11-18-19h30',
      name: 'Hospital Casa Menssana',
      addr: 'Rua Marechal Jofre, N° 30 – Grajaú',
      date: '2026-11-18',
      time: '19:30',
      slots: ['', '', ''],
      notes: 'Visita noturna à enfermaria',
    },
    {
      id: 'visit-2026-11-23-16h',
      name: 'Hospital São Francisco na Providência de Deus',
      addr: 'Rua Conde de Bonfim, N° 1030 – Tijuca',
      date: '2026-11-23',
      time: '16:00',
      slots: ['', '', ''],
      notes: 'Apresentar documento de identificação na portaria',
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
