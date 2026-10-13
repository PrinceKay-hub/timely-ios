import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as MapLibre from '@maplibre/maplibre-react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
    collection,
    getDocs,
    getFirestore,
    limit,
    query,
    where,
} from 'firebase/firestore';
import {
    Bounds,
    LngLat,
    Provider,
    cellsFor,
    computePillIds,
    distanceMeters,
    formatDistance,
    inBounds,
    providerLngLat,
    spreadPositions
} from '@/utils/mapGeo';

const STYLE_URL = 'https://timelygh.com/styles/timely-style.json';
const FALLBACK_CENTER: LngLat = [-1.6244, 6.6885]; // Kumasi, used if location is unavailable
const PURPLE = '#9C27B0';

// NOTE: MapLibre zoom is flutter_map zoom minus 1 (512px vs 256px tiles).
const FALLBACK_ZOOM = 11; // Flutter 12
const MIN_SEARCH_ZOOM = 9; // Flutter 10

type SortMode = 'topRated' | 'nearest';

const db = getFirestore();

export default function ProviderMapScreen() {
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapLibre.MapRef>(null);
    const cameraRef = useRef<MapLibre.CameraRef>(null);
    const cellCache = useRef(new Map<string, Provider[]>());
    const watchRef = useRef<Location.LocationSubscription | null>(null);
    const lastDotPress = useRef(0);

    const [results, setResults] = useState<Provider[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [moved, setMoved] = useState(false);
    const [zoom, setZoom] = useState(FALLBACK_ZOOM);
    const [userLoc, setUserLoc] = useState<LngLat | null>(null);
    const [sort, setSort] = useState<SortMode>('topRated');

    const canSearch = zoom >= MIN_SEARCH_ZOOM;

    const positions = useMemo(() => spreadPositions(results, zoom), [results, zoom]);

    // ---------- derived data ----------

    const pillIds = useMemo(
        () => computePillIds(results, selectedId, zoom, positions),
        [results, selectedId, zoom, positions],
    );

    const selected = useMemo(
        () => results.find((p) => p.id === selectedId) ?? null,
        [results, selectedId],
    );

    const distanceOf = (p: Provider): number | null => {
        const ll = providerLngLat(p);
        return userLoc && ll ? distanceMeters(userLoc, ll) : null;
    };

    const sorted = useMemo(() => {
        const list = [...results];
        if (sort === 'nearest' && userLoc) {
            const d = (p: Provider) => {
                const ll = providerLngLat(p);
                return ll ? distanceMeters(userLoc, ll) : Infinity;
            };
            list.sort((a, b) => d(a) - d(b));
        } else {
            list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        }
        return list;
    }, [results, sort, userLoc]);

    const dotsGeoJSON = useMemo(
        () => ({
            type: 'FeatureCollection' as const,
            features: results.flatMap((p) => {
                const ll = positions.get(p.id);
                return ll
                    ? [
                        {
                            type: 'Feature' as const,
                            id: p.id,
                            properties: { id: p.id },
                            geometry: { type: 'Point' as const, coordinates: ll },
                        },
                    ]
                    : [];
            }),
        }),
        [results, positions],
    );

    const legsGeoJSON = useMemo(
        () => ({
            type: 'FeatureCollection' as const,
            features: results.flatMap((p) => {
                const from = providerLngLat(p);
                const to = positions.get(p.id);
                if (!from || !to || (from[0] === to[0] && from[1] === to[1])) return [];
                return [
                    {
                        type: 'Feature' as const,
                        properties: {},
                        geometry: { type: 'LineString' as const, coordinates: [from, to] },
                    },
                ];
            }),
        }),
        [results, positions],
    );

    // dots only for providers that did not get a pill
    const dotFilter = useMemo(
        () => ['!', ['in', ['get', 'id'], ['literal', [...pillIds]]]] as any,
        [pillIds],
    );

    // ---------- search ----------

    const searchArea = async () => {
        const map = mapRef.current;
        if (!map) return;

        const z = await map.getZoom();
        setZoom(z);
        if (z < MIN_SEARCH_ZOOM) return;

        const [west, south, east, north] = await map.getBounds();
        const bounds: Bounds = { north, south, east, west };

        setLoading(true);
        setMoved(false);

        const cells = cellsFor(bounds);
        const toFetch = cells.filter((c) => !cellCache.current.has(c));

        try {
            await Promise.all(
                toFetch.map(async (cell) => {
                    const snap = await getDocs(
                        query(
                            collection(db, 'services'),
                            where('status', '==', 'approved'),
                            where('geohash', '>=', cell),
                            where('geohash', '<', cell + '~'),
                            limit(100),
                        ),
                    );
                    cellCache.current.set(
                        cell,
                        snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Provider),
                    );
                }),
            );
        } catch (e) {
            console.warn('Map search failed', e);
        }

        // collect from cache, dedupe, keep only what is inside the viewport
        const byId = new Map<string, Provider>();
        for (const c of cells) {
            for (const p of cellCache.current.get(c) ?? []) {
                const ll = providerLngLat(p);
                if (ll && inBounds(ll, bounds)) byId.set(p.id, p);
            }
        }

        setResults([...byId.values()]);
        setSelectedId((prev) => (prev && byId.has(prev) ? prev : null));
        setLoading(false);
    };

    // ---------- location ----------

    const ensurePermission = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
    };

    const startWatching = async () => {
        if (watchRef.current) return;
        watchRef.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 10 }, // meters
            (loc) => setUserLoc([loc.coords.longitude, loc.coords.latitude]),
        );
    };

    const flyTo = (ll: LngLat, z: number, ms = 500) =>
        cameraRef.current?.easeTo({ center: ll, zoom: z, duration: ms });

    const goToMyLocation = async () => {
        try {
            if (!(await ensurePermission())) return;
            let ll = userLoc;
            if (!ll) {
                const pos = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                ll = [pos.coords.longitude, pos.coords.latitude];
                setUserLoc(ll);
            }
            flyTo(ll, 13);
            startWatching();
        } catch (e) {
            console.warn('Could not get location', e);
        }
    };

    const init = async () => {
        try {
            if (await ensurePermission()) {
                // instant: last known position cached by the OS
                const last = await Location.getLastKnownPositionAsync();
                if (last) {
                    const ll: LngLat = [last.coords.longitude, last.coords.latitude];
                    setUserLoc(ll);
                    cameraRef.current?.jumpTo({ center: ll, zoom: 13 });
                }
                startWatching();
            }
        } catch (e) {
            console.warn('Init location failed', e);
        }
        searchArea(); // do not wait for a fresh GPS fix
    };

    useEffect(() => {
        return () => {
            watchRef.current?.remove();
            watchRef.current = null;
        };
    }, []);

    // ---------- selection ----------

    const select = (p: Provider, moveMap = true) => {
        if (!moveMap) lastDotPress.current = Date.now();
        setSelectedId((prev) => (!moveMap && prev === p.id ? null : p.id));
        if (moveMap) {
            const ll = providerLngLat(p);
            if (ll) flyTo(ll, Math.max(zoom, 14), 400);
        }
    };

    const openDetail = (id: string) =>
        router.push({ pathname: '/service/[id]', params: { id } }); // adjust to your route

    // ---------- map events ----------

    const onRegionDidChange = (e: {
        nativeEvent: { zoom: number; userInteraction: boolean };
    }) => {
        const { zoom: z, userInteraction } = e.nativeEvent;
        if (typeof z === 'number') setZoom(z);
        if (userInteraction) setMoved(true);
    };

    const onDotPress = (e: any) => {
        e.stopPropagation?.();
        const id = e.nativeEvent?.features?.[0]?.properties?.id;
        const p = results.find((r) => r.id === id);
        if (p) select(p, false);
    };

    const onMapPress = () => {
        // iOS (Fabric) can fire the map press as well as the source press, so ignore it right after a dot tap
        if (Date.now() - lastDotPress.current < 300) return;
        setSelectedId(null);
    };

    // ---------- render ----------

    return (
        <View style={styles.flex}>
            <MapLibre.Map
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                mapStyle={STYLE_URL}
                touchRotate={false}
                touchPitch={false}
                compass={false}
                logo={false}
                attribution
                onPress={onMapPress}
                onDidFinishLoadingMap={init}
                onRegionDidChange={onRegionDidChange}
            >
                <MapLibre.Camera
                    ref={cameraRef}
                    initialViewState={{ center: FALLBACK_CENTER, zoom: FALLBACK_ZOOM }}
                    minZoom={2}
                    maxZoom={18}
                />

                <MapLibre.GeoJSONSource id="legs-src" data={legsGeoJSON}>
                    <MapLibre.Layer
                        id="legs"
                        type="line"
                        paint={{ 'line-color': '#212121', 'line-opacity': 0.35, 'line-width': 1 }}
                    />
                </MapLibre.GeoJSONSource>

                {/* dots: drawn natively, so hundreds are cheap */}
                <MapLibre.GeoJSONSource
                    id="provider-dots-src"
                    data={dotsGeoJSON}
                    hitbox={{ top: 16, right: 16, bottom: 16, left: 16 }}
                    onPress={onDotPress}
                >
                    <MapLibre.Layer
                        id="provider-dots"
                        type="circle"
                        filter={dotFilter}
                        paint={{
                            'circle-radius': 7,
                            'circle-color': '#212121',
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#ffffff',
                        }}
                    />
                </MapLibre.GeoJSONSource>

                {/* user location */}
                {userLoc && (
                    <MapLibre.GeoJSONSource
                        id="user-src"
                        data={{
                            type: 'Feature',
                            properties: {},
                            geometry: { type: 'Point', coordinates: userLoc },
                        }}
                    >
                        <MapLibre.Layer
                            id="user-halo"
                            type="circle"
                            paint={{
                                'circle-radius': 18,
                                'circle-color': '#1A73E8',
                                'circle-opacity': 0.25,
                            }}
                        />
                        <MapLibre.Layer
                            id="user-dot"
                            type="circle"
                            paint={{
                                'circle-radius': 8,
                                'circle-color': '#1A73E8',
                                'circle-stroke-width': 3,
                                'circle-stroke-color': '#ffffff',
                            }}
                        />
                    </MapLibre.GeoJSONSource>
                )}

                {/* rating pills (max 60) */}
                {results
                    .filter((p) => pillIds.has(p.id) && positions.has(p.id))
                    .sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId))
                    .map((p) => (
                        <MapLibre.Marker key={p.id} lngLat={positions.get(p.id)!} anchor="bottom">
                        <RatingPill
                            rating={p.rating ?? 0}
                            selected={p.id === selectedId}
                            onPress={() => select(p, false)}
                        />
                        </MapLibre.Marker>
                    ))}

                {/* floating card above the selected pill (declared last so it draws on top) */}
                {selected && positions.get(selected.id) && (
                <MapLibre.Marker
                    key={`card-${selected.id}`}
                    lngLat={positions.get(selected.id)!}
                    anchor="bottom"
                    offset={[0, -42]}
                >
                    <ProviderCard
                    p={selected}
                    meters={distanceOf(selected)}
                    onPress={() => openDetail(selected.id)}
                    />
                </MapLibre.Marker>
                )}
            </MapLibre.Map>

            {/* top overlay */}
            <View style={[styles.topOverlay, { top: insets.top + 12 }]} pointerEvents="box-none">
                {loading ? (
                    <View style={styles.chip}>
                        <ActivityIndicator size="small" />
                        <Text style={styles.chipText}>Searching…</Text>
                    </View>
                ) : !canSearch ? (
                    <View style={styles.chip}>
                        <Ionicons name="search" size={16} color="#444" />
                        <Text style={styles.chipText}>Zoom in to see providers</Text>
                    </View>
                ) : moved ? (
                    <Pressable style={styles.searchBtn} onPress={searchArea}>
                        <Ionicons name="search" size={16} color="#222" />
                        <Text style={styles.searchBtnText}>Search this area</Text>
                    </Pressable>
                ) : null}
            </View>

            <Pressable
                style={[styles.locBtn, { top: insets.top + 70 }]}
                onPress={goToMyLocation}
            >
                <Ionicons name="navigate-outline" size={20} color="#222" />
            </Pressable>

            <Pressable
                style={[styles.backBtn, { top: insets.top + 12 }]}
                hitSlop={8}
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            >
                <Ionicons name="arrow-back" size={22} color="#222" />
            </Pressable>

            {/* results sheet; the header is outside the list but still drags the sheet */}
            <BottomSheet index={1} snapPoints={['16%', '32%', '85%']} enableDynamicSizing={false}>
                <View style={styles.flex}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>
                            {loading ? 'Searching…' : `${results.length} providers in this area`}
                        </Text>
                        <View style={styles.chipsRow}>
                            <SortChip
                                label="Top rated"
                                active={sort === 'topRated'}
                                onPress={() => setSort('topRated')}
                            />
                            <SortChip
                                label="Nearest"
                                active={sort === 'nearest'}
                                disabled={!userLoc}
                                onPress={() => setSort('nearest')}
                            />
                        </View>
                    </View>

                    <BottomSheetFlatList
                        data={sorted}
                        keyExtractor={(p: Provider) => p.id}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        ItemSeparatorComponent={() => <View style={styles.sep} />}
                        ListEmptyComponent={
                            <Text style={styles.empty}>
                                {canSearch
                                    ? 'No providers in this area. Try zooming out or moving the map.'
                                    : 'Zoom in on the map to see providers.'}
                            </Text>
                        }
                        renderItem={({ item }: { item: Provider }) => (
                            <ProviderRow
                                p={item}
                                meters={distanceOf(item)}
                                selected={item.id === selectedId}
                                onPress={() => openDetail(item.id)} // swap for select(item) to center the map instead
                            />
                        )}
                    />
                </View>
            </BottomSheet>
        </View>
    );
}

// ---------- small components ----------

function RatingPill({
    rating,
    selected,
    onPress,
}: {
    rating: number;
    selected: boolean;
    onPress: () => void;
}) {
    const color = selected ? PURPLE : '#212121';
    return (
        <Pressable onPress={onPress} hitSlop={8} style={styles.pillWrap}>
            <View style={[styles.pill, { backgroundColor: color }]}>
                <Ionicons name="star" size={14} color="#fff" />
                <Text style={styles.pillText}>{rating.toFixed(1)}</Text>
            </View>
            <View style={[styles.tail, { borderTopColor: color }]} />
        </Pressable>
    );
}

function ProviderCard({
    p,
    meters,
    onPress,
}: {
    p: Provider;
    meters: number | null;
    onPress: () => void;
}) {
    const photo = p.images?.[0];
    return (
        <Pressable onPress={onPress} style={styles.card}>
            <View style={styles.card}>
                {photo ? (
                    <Image source={{ uri: photo }} style={styles.cardImg} contentFit="cover" />
                ) : (
                    <View style={[styles.cardImg, { backgroundColor: '#0001' }]} />
                )}
                <View style={styles.cardBody}>
                    <Text style={styles.cardName} numberOfLines={1}>
                        {p.name ?? ''}
                    </Text>
                    <View style={styles.cardMeta}>
                        <Ionicons name="star" size={15} color="#FFC107" />
                        <Text style={styles.cardRating}>{(p.rating ?? 0).toFixed(1)}</Text>
                        {meters != null && (
                            <>
                                <Ionicons name="navigate" size={13} color="#0006" style={{ marginLeft: 8 }} />
                                <Text style={styles.cardDist}>{formatDistance(meters)}</Text>
                            </>
                        )}
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#0005" style={{ marginRight: 6 }} />
            </View>
        </Pressable>
    );
}

function ProviderRow({
    p,
    meters,
    selected,
    onPress,
}: {
    p: Provider;
    meters: number | null;
    selected: boolean;
    onPress: () => void;
}) {
    const photo = p.images?.[0];
    const sub = [
        `★ ${(p.rating ?? 0).toFixed(1)}`,
        meters != null ? formatDistance(meters) : null,
        p.location,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <Pressable
            onPress={onPress}
            style={[styles.row, selected && { backgroundColor: 'rgba(156,39,176,0.08)' }]}
        >
            {photo ? (
                <Image source={{ uri: photo }} style={styles.rowImg} contentFit="cover" />
            ) : (
                <View style={[styles.rowImg, { backgroundColor: '#0001' }]} />
            )}
            <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                    {p.name ?? ''}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                    {sub}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#0006" />
        </Pressable>
    );
}

function SortChip({
    label,
    active,
    disabled,
    onPress,
}: {
    label: string;
    active: boolean;
    disabled?: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            disabled={disabled}
            onPress={onPress}
            style={[styles.sortChip, active && styles.sortChipActive, disabled && { opacity: 0.4 }]}
        >
            <Text style={[styles.sortChipText, active && { color: '#fff' }]}>{label}</Text>
        </Pressable>
    );
}

// ---------- styles ----------

const styles = StyleSheet.create({
    flex: { flex: 1 },

    topOverlay: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
    },
    chipText: { fontSize: 13, color: '#333' },
    searchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
    },
    searchBtnText: { fontWeight: '600', color: '#222' },

    locBtn: {
        position: 'absolute',
        right: 12,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
    },

    // pill
    pillWrap: { alignItems: 'center' },
    pill: {
        height: 28,
        paddingHorizontal: 10,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pillText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    tail: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },

    // floating card
    card: {
        width: 280,
        height: 88,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    cardImg: { width: 88, height: 88 },
    cardBody: { flex: 1, paddingHorizontal: 12, justifyContent: 'center' },
    cardName: { fontSize: 15, fontWeight: '700' },
    cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 3 },
    cardRating: { fontWeight: '600' },
    cardDist: { color: '#0009' },

    // sheet
    sheetHeader: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
    sheetTitle: { fontSize: 16, fontWeight: '600' },
    chipsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    sortChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#0002',
    },
    sortChipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
    sortChipText: { fontSize: 13, color: '#333' },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#0002' },
    empty: { textAlign: 'center', padding: 24, color: '#555' },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
    rowImg: { width: 56, height: 56, borderRadius: 8 },
    rowName: { fontSize: 15, fontWeight: '600' },
    rowSub: { fontSize: 12, color: '#0009', marginTop: 2 },
    backBtn: {
        position: 'absolute',
        left: 12,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
    },
});