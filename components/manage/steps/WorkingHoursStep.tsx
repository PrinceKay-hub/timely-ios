import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { useTheme } from '@/providers/ThemeProvider';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

type PickerTarget = 'start' | 'end' | null;

// ─── WheelPicker (themed) ────────────────────────────────────────────────────

interface WheelPickerProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width?: number;
  colors: any;
}

const WheelPicker: React.FC<WheelPickerProps> = ({
  items,
  selectedIndex,
  onSelect,
  width = 70,
  colors,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const currentIndex = useRef(selectedIndex);
  const isSnapping = useRef(false);

  // Dynamic styles for the wheel picker
  const wheelStyles = useMemo(() => createWheelStyles(colors), [colors]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  const snap = useCallback(
    (offsetY: number) => {
      if (isSnapping.current) return;
      isSnapping.current = true;

      const raw = offsetY / ITEM_HEIGHT;
      const index = Math.max(0, Math.min(Math.round(raw), items.length - 1));

      if (index !== currentIndex.current) {
        currentIndex.current = index;
        onSelect(index);
      }

      scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });

      setTimeout(() => {
        isSnapping.current = false;
      }, 350);
    },
    [items.length, onSelect]
  );

  return (
    <View style={[wheelStyles.container, { width }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => snap(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          const vy = (e.nativeEvent as any).velocity?.y ?? 0;
          if (Math.abs(vy) < 0.1) {
            snap(e.nativeEvent.contentOffset.y);
          }
        }}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
      >
        {items.map((item, i) => {
          const isSelected = i === selectedIndex;
          return (
            <TouchableOpacity
              key={i}
              style={wheelStyles.item}
              activeOpacity={0.6}
              onPress={() => {
                currentIndex.current = i;
                onSelect(i);
                scrollRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true });
              }}
            >
              <Text
                style={[
                  wheelStyles.itemText,
                  isSelected && wheelStyles.itemTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View pointerEvents="none" style={wheelStyles.selectionBand} />
      <View pointerEvents="none" style={[wheelStyles.fade, wheelStyles.fadeTop]} />
      <View pointerEvents="none" style={[wheelStyles.fade, wheelStyles.fadeBottom]} />
    </View>
  );
};

// ─── Wheel styles factory ──────────────────────────────────────────────────
const createWheelStyles = (colors: any) =>
  StyleSheet.create({
    container: { height: PICKER_HEIGHT, overflow: 'hidden', position: 'relative' },
    item: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
    itemText: { fontSize: 20, color: colors.textSecondary || '#BCBCC8', fontWeight: '400' },
    itemTextSelected: { fontSize: 26, color: colors.text, fontWeight: '700' },
    selectionBand: {
      position: 'absolute',
      top: ITEM_HEIGHT * 2,
      left: 6,
      right: 6,
      height: ITEM_HEIGHT,
      borderTopWidth: 1.5,
      borderBottomWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 6,
    },
    fade: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: ITEM_HEIGHT * 1.8,
    },
    fadeTop: { top: 0, backgroundColor: 'transparent' },
    fadeBottom: { bottom: 0, backgroundColor: 'transparent' },
  });

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTime = (hour: number, minute: number) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:${minute.toString().padStart(2, '0')} ${period}`;
};

const toIndices = (hour24: number, minute: number) => ({
  hourIdx: (hour24 % 12 || 12) - 1,
  minuteIdx: Math.round(minute / 5) % 12,
  periodIdx: hour24 >= 12 ? 1 : 0,
});

const fromIndices = (hourIdx: number, minuteIdx: number, periodIdx: number) => {
  let hour = hourIdx + 1;
  if (periodIdx === 1 && hour !== 12) hour += 12;
  if (periodIdx === 0 && hour === 12) hour = 0;
  return { hour, minute: minuteIdx * 5 };
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const WorkingHoursStep = () => {
  const { currentService, updateServiceField } = useServiceRegistrationStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Dynamic styles for the main component
  const styles = useMemo(() => createStyles(colors), [colors]);

  const service = currentService!;

  const [activeTarget, setActiveTarget] = useState<PickerTarget>(null);
  const [hourIdx, setHourIdx] = useState(0);
  const [minuteIdx, setMinuteIdx] = useState(0);
  const [periodIdx, setPeriodIdx] = useState(0);

  const openPicker = (target: PickerTarget) => {
    const h = target === 'start' ? service.workingHours.startHour : service.workingHours.endHour;
    const m = target === 'start' ? service.workingHours.startMinute : service.workingHours.endMinute;
    const idx = toIndices(h, m);
    setHourIdx(idx.hourIdx);
    setMinuteIdx(idx.minuteIdx);
    setPeriodIdx(idx.periodIdx);
    setActiveTarget(target);
  };

  const closePicker = () => setActiveTarget(null);

  const confirmTime = () => {
    if (!activeTarget) return;
    const { hour, minute } = fromIndices(hourIdx, minuteIdx, periodIdx);
    const field =
      activeTarget === 'start'
        ? { startHour: hour, startMinute: minute }
        : { endHour: hour, endMinute: minute };
    updateServiceField('workingHours', { ...service.workingHours, ...field });
    closePicker();
  };

  const toggleDay = (day: string) => {
    const days = service.workingDays || [];
    updateServiceField(
      'workingDays',
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
    );
  };

  // Android
  const [showAndroid, setShowAndroid] = useState(false);
  const androidTarget = useRef<PickerTarget>(null);
  const [androidValue, setAndroidValue] = useState(new Date());

  const openAndroid = (target: PickerTarget) => {
    const h = target === 'start' ? service.workingHours.startHour : service.workingHours.endHour;
    const m = target === 'start' ? service.workingHours.startMinute : service.workingHours.endMinute;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    setAndroidValue(d);
    androidTarget.current = target;
    setShowAndroid(true);
  };

  const handleAndroidChange = (_: any, date?: Date) => {
    setShowAndroid(false);
    if (date && androidTarget.current) {
      const field =
        androidTarget.current === 'start'
          ? { startHour: date.getHours(), startMinute: date.getMinutes() }
          : { endHour: date.getHours(), endMinute: date.getMinutes() };
      updateServiceField('workingHours', { ...service.workingHours, ...field });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Ionicons name="time-outline" size={60} color={colors.primary} />
      <Text style={[styles.title, { color: colors.text }]}>Working Hours</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        When are you available for appointments?
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card || colors.background }]}>
        <Text style={[styles.label, { color: colors.text }]}>Working Days</Text>
        <View style={styles.daysRow}>
          {DAYS.map((day) => {
            const selected = service.workingDays?.includes(day) || false;
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: selected ? colors.primary : colors.surface,
                    borderColor: selected ? colors.primary : colors.border || '#eee',
                  },
                ]}
                onPress={() => toggleDay(day)}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: selected ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.text, marginTop: 24 }]}>Operating Hours</Text>
        <View style={styles.timeRow}>
          <TouchableOpacity
            style={[styles.timeBox, { backgroundColor: colors.surface }]}
            onPress={() => (Platform.OS === 'ios' ? openPicker('start') : openAndroid('start'))}
            activeOpacity={0.7}
          >
            <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Start Time</Text>
            <Text style={[styles.timeValue, { color: colors.text }]}>
              {formatTime(service.workingHours.startHour, service.workingHours.startMinute)}
            </Text>
          </TouchableOpacity>

          <Ionicons name="arrow-forward" size={20} color={colors.textSecondary} style={{ marginHorizontal: 10 }} />

          <TouchableOpacity
            style={[styles.timeBox, { backgroundColor: colors.surface }]}
            onPress={() => (Platform.OS === 'ios' ? openPicker('end') : openAndroid('end'))}
            activeOpacity={0.7}
          >
            <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>End Time</Text>
            <Text style={[styles.timeValue, { color: colors.text }]}>
              {formatTime(service.workingHours.endHour, service.workingHours.endMinute)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Android */}
      {Platform.OS === 'android' && showAndroid && (
        <DateTimePicker
          value={androidValue}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleAndroidChange}
        />
      )}

      {/* iOS custom wheel picker */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={activeTarget !== null}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={closePicker}
        >
          <TouchableWithoutFeedback onPress={closePicker}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.sheet, { backgroundColor: colors.card || colors.background }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border || '#D1D5DB' }]} />

            <View style={[styles.sheetHeader, { borderBottomColor: colors.border || '#E5E7EB' }]}>
              <TouchableOpacity
                onPress={closePicker}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[styles.cancelText, { color: colors.error || '#EF4444' }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {activeTarget === 'start' ? 'Start Time' : 'End Time'}
              </Text>
              <TouchableOpacity
                onPress={confirmTime}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[styles.doneText, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.wheelsRow}>
              <WheelPicker
                key={`hour-${activeTarget}`}
                items={HOURS}
                selectedIndex={hourIdx}
                onSelect={setHourIdx}
                width={80}
                colors={colors}
              />
              <Text style={[styles.colon, { color: colors.text }]}>:</Text>
              <WheelPicker
                key={`min-${activeTarget}`}
                items={MINUTES}
                selectedIndex={minuteIdx}
                onSelect={setMinuteIdx}
                width={80}
                colors={colors}
              />
              <WheelPicker
                key={`period-${activeTarget}`}
                items={PERIODS}
                selectedIndex={periodIdx}
                onSelect={setPeriodIdx}
                width={72}
                colors={colors}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
    subtitle: { fontSize: 16, marginBottom: 24 },
    card: { borderRadius: 15, padding: 16 },
    label: { fontWeight: '600', fontSize: 14, marginBottom: 8 },
    daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dayChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    dayText: { fontWeight: '600' },
    timeRow: { flexDirection: 'row', alignItems: 'center' },
    timeBox: { flex: 1, borderRadius: 12, padding: 16 },
    timeLabel: { fontSize: 12, marginBottom: 4 },
    timeValue: { fontSize: 16, fontWeight: 'bold' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 40,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      marginTop: 12,
      marginBottom: 4,
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    sheetTitle: { fontSize: 16, fontWeight: '600' },
    cancelText: { fontSize: 16 },
    doneText: { fontSize: 16, fontWeight: '700' },
    wheelsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 12,
    },
    colon: { fontSize: 28, fontWeight: '700', marginHorizontal: 2, marginBottom: 4 },
  });