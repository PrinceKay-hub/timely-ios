import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type WorkingHours = {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

type Service = {
  workingDays?: string[];
  workingHours?: WorkingHours;
};

type OpenStatus = {
  isOpen: boolean;
  detail: string | null;
};

const DAY_ABBREV = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12;
  const displayHour = hour12 === 0 ? 12 : hour12;
  return `${displayHour.toString().padStart(2, '0')}:${minute
    .toString()
    .padStart(2, '0')} ${period}`;
}

function nextOpenDayLabel(days: string[], todayIndex: number): string | null {
  for (let i = 1; i <= 7; i++) {
    const idx = (todayIndex + i) % 7;
    if (days.includes(DAY_ABBREV[idx])) {
      return i === 1 ? 'tomorrow' : DAY_FULL[idx];
    }
  }
  return null;
}

function computeOpenStatus(service: Service): OpenStatus {
  const days = service.workingDays ?? [];
  const hours = service.workingHours;

  if (days.length === 0 || !hours) {
    return { isOpen: false, detail: null };
  }

  const now = new Date();

  const { startHour, startMinute, endHour, endMinute } = hours;

  const startMinutes = startHour * 60 + startMinute;
  let endMinutes = endHour * 60 + endMinute;
  const overnight = endMinutes <= startMinutes; // e.g. 18:00 -> 02:00
  if (overnight) endMinutes += 24 * 60;

  const worksOn = (weekdayIndex: number) =>
    days.includes(DAY_ABBREV[weekdayIndex]);

  // JS getDay(): 0 = Sun ... 6 = Sat -> convert to 0-based Mon-first index
  const todayIndex = (now.getDay() + 6) % 7;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let isOpen = false;
  let minutesUntilClose: number | null = null;
  let minutesUntilOpen: number | null = null; // set only when the shop opens LATER TODAY

  // Check today's shift, and yesterday's shift if it's an overnight
  // shift that spills into today.
  if (worksOn(todayIndex)) {
    if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
      isOpen = true;
      minutesUntilClose = endMinutes - nowMinutes;
    } else if (nowMinutes < startMinutes) {
      minutesUntilOpen = startMinutes - nowMinutes;
    }
  }

  if (!isOpen && overnight) {
    const yesterdayIndex = (todayIndex - 1 + 7) % 7;
    if (worksOn(yesterdayIndex)) {
      if (nowMinutes < endMinutes - 24 * 60) {
        isOpen = true;
        minutesUntilClose = endMinutes - 24 * 60 - nowMinutes;
      }
    }
  }

  let detail: string | null = null;
  if (isOpen && minutesUntilClose !== null) {
    detail =
      minutesUntilClose <= 60
        ? `Closes in ${minutesUntilClose}m`
        : `Closes at ${formatTime(endHour, endMinute)}`;
  } else if (!isOpen) {
    if (minutesUntilOpen !== null) {
      // The shop still has a shift coming up later TODAY — always say
      // so, regardless of how far away it is, rather than only handling
      // the <=60-minute case and falling through to the "next open day"
      // search, which starts at tomorrow and never considers today.
      detail =
        minutesUntilOpen <= 60
          ? `Opens in ${minutesUntilOpen}m`
          : `Opens today at ${formatTime(startHour, startMinute)}`;
    } else {
      const nextDay = nextOpenDayLabel(days, todayIndex);
      detail = nextDay
        ? `Opens ${nextDay} ${formatTime(startHour, startMinute)}`
        : null;
    }
  }

  return { isOpen, detail };
}

type Props = {
  service: Service;
};

export default function OpenStatusBadge({ service }: Props) {
  const status = computeOpenStatus(service);

  const color = status.isOpen ? '#22c55e' : '#ef4444';
  const bg = status.isOpen ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: bg }]}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.badgeText, { color }]}>
            {status.isOpen ? 'Open' : 'Closed'}
          </Text>
        </View>
        {status.detail && <Text style={styles.detailText}>{status.detail}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#9ca3af',
  },
});