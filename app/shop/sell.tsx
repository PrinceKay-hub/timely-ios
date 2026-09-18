import { createProduct, getUploadUrls, updateProduct, uploadImageToB2 } from "@/services/shopApi";
import { useSelectedLocationStore } from "@/stores/selectedLocationStore";
import { CATEGORIES, Product, ProductCategory } from "@/types/product";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
} from "react-native";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { useAuthStore } from '@/stores/auth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from "@/providers/ThemeProvider";

const MAX_IMAGES = 5;
const MAX_TAGS = 15;
const CURRENCY = "GHS";

interface PickedImage {
    id: string;
    uri: string;
    processing: boolean;
}

function parseSelectedLocation(value: string | null): { region: string; district: string } | null {
    if (!value) return null;
    const [region, district] = value.split(" - ").map((part) => part.trim());
    if (!region || !district) return null;
    return { region, district };
}

export default function SellScreen() {
    const { theme } = useTheme();
    const colors = theme.colors;
    const isDark = theme.dark;

    const styles = useMemo(() => createStyles(colors), [colors]);

    const { productId } = useLocalSearchParams<{ productId?: string }>();
    const isEditMode = !!productId;

    const [images, setImages] = useState<PickedImage[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [category, setCategory] = useState<ProductCategory | null>(null);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [landmark, setLandmark] = useState("");
    const selectedLocation = useSelectedLocationStore((s) => s.selectedLocation);
    const setSelectedLocation = useSelectedLocationStore((s) => s.setSelectedLocation);
    const [useCall, setUseCall] = useState(false);
    const [callNumber, setCallNumber] = useState("");
    const [isDelivery, setIsDelivery] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { user, profile } = useAuthStore();

    const [loadingProduct, setLoadingProduct] = useState(isEditMode);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        if (!productId) return;

        (async () => {
            setLoadingProduct(true);
            setLoadError(false);
            try {
                const snap = await getDoc(doc(getFirestore(), "products", productId));
                if (!snap.exists()) {
                    Alert.alert("Not found", "This listing no longer exists.");
                    router.back();
                    return;
                }

                const data = snap.data() as Product;

                if (user && data.sellerId !== user.uid) {
                    Alert.alert("Not allowed", "You can only edit your own listings.");
                    router.back();
                    return;
                }

                setName(data.name);
                setDescription(data.description);
                setPrice(String(data.price));
                setCategory(data.category);
                setTags(data.tags ?? []);
                setExistingImages(data.images ?? []);
                setIsDelivery(!!data.isDelivery);

                if (data.contact) {
                    setUseCall(true);
                    setCallNumber(data.contact);
                } else {
                    setUseCall(false);
                    setCallNumber("");
                }

                if (data.location) {
                    setSelectedLocation(`${data.location.region} - ${data.location.district}`);
                    setLandmark(data.location.landmark ?? "");
                }
            } catch (err) {
                console.error("Failed to load listing for edit:", err);
                setLoadError(true);
            } finally {
                setLoadingProduct(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId]);

    async function pickImages() {
        const totalCount = existingImages.length + images.length;
        if (totalCount >= MAX_IMAGES) {
            Alert.alert("Limit reached", `You can upload up to ${MAX_IMAGES} photos.`);
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: MAX_IMAGES - totalCount,
            quality: 1,
        });

        if (result.canceled) return;

        const newEntries: PickedImage[] = result.assets.map((asset, i) => ({
            id: `${Date.now()}-${i}-${asset.assetId ?? asset.uri}`,
            uri: asset.uri,
            processing: true,
        }));

        setImages((prev) => [...prev, ...newEntries].slice(0, MAX_IMAGES - existingImages.length));

        newEntries.forEach((entry, i) => {
            compressImage(entry, result.assets[i].uri);
        });
    }

    async function compressImage(entry: PickedImage, sourceUri: string) {
        try {
            const manipulated = await ImageManipulator.manipulateAsync(
                sourceUri,
                [{ resize: { width: 1080 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.WEBP }
            );
            setImages((prev) =>
                prev.map((img) =>
                    img.id === entry.id ? { ...img, uri: manipulated.uri, processing: false } : img
                )
            );
        } catch (err) {
            console.error("Failed to process image:", err);
            setImages((prev) => prev.filter((img) => img.id !== entry.id));
            Alert.alert("Image error", "One of your photos couldn't be processed. Try a different one.");
        }
    }

    function removeImage(id: string) {
        setImages((prev) => prev.filter((i) => i.id !== id));
    }

    function removeExistingImage(url: string) {
        setExistingImages((prev) => prev.filter((u) => u !== url));
    }

    function addTag() {
        const cleaned = tagInput.trim().toLowerCase();
        if (!cleaned) return;
        if (tags.includes(cleaned)) {
            setTagInput("");
            return;
        }
        if (tags.length >= MAX_TAGS) {
            Alert.alert("Limit reached", `You can add up to ${MAX_TAGS} tags.`);
            return;
        }
        setTags((prev) => [...prev, cleaned]);
        setTagInput("");
    }

    function removeTag(tag: string) {
        setTags((prev) => prev.filter((t) => t !== tag));
    }

    function validate(): string | null {
        if (existingImages.length + images.length === 0) return "Add at least one photo.";
        if (images.some((i) => i.processing)) return "Hang on — your photos are still processing.";
        if (!name.trim()) return "Enter a product name.";
        if (!price || isNaN(Number(price)) || Number(price) <= 0) return "Enter a valid price.";
        if (!category) return "Choose a category.";
        if (useCall && !callNumber.trim()) return "Enter a Call number.";
        if (selectedLocation === "Select Location") return "Select a location";
        if (!landmark.trim()) return "Enter nearest landmark";
        return null;
    }

    async function handleSubmit() {
        const error = validate();
        if (error) {
            Alert.alert("Check your listing", error);
            return;
        }

        setSubmitting(true);
        try {
            let newImageKeys: string[] = [];
            if (images.length > 0) {
                const uploads = await getUploadUrls(
                    images.map(() => ({ contentType: "image/webp" }))
                );

                await Promise.all(
                    uploads.map((u, i) => uploadImageToB2(u.uploadUrl, images[i].uri, u.contentType))
                );

                newImageKeys = uploads.map((u) => u.key);
            }

            const contact = useCall ? callNumber.trim() : "";

            const parsedLocation = parseSelectedLocation(selectedLocation);
            const location = parsedLocation
                ? {
                    region: parsedLocation.region,
                    district: parsedLocation.district,
                    landmark: landmark.trim(),
                }
                : {
                    region: "",
                    district: "",
                    landmark: "",
                };

            if (isEditMode && productId) {
                await updateProduct({
                    productId,
                    name: name.trim(),
                    description: description.trim(),
                    price: Number(price),
                    category: category as ProductCategory,
                    tags,
                    images: existingImages,
                    newImageKeys,
                    contact,
                    isDelivery,
                    location,
                });
                Alert.alert("Listing updated", "Your changes are live.");
            } else {
                await createProduct({
                    name: name.trim(),
                    description: description.trim(),
                    price: Number(price),
                    category: category as ProductCategory,
                    tags,
                    imageKeys: newImageKeys,
                    contact,
                    isDelivery,
                    location,
                    sellerName: profile?.displayName || user.displayName,
                });
                Alert.alert("Listed successfully", "Your product is now under going review.");
            }

            setSelectedLocation("Select Location");
            router.back();
        } catch (err) {
            console.error(`Failed to ${isEditMode ? "update" : "create"} listing:`, err);
            Alert.alert(
                "Something went wrong",
                `Couldn't ${isEditMode ? "save your changes" : "publish your listing"}. Try again.`
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (loadingProduct) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (loadError) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <Text style={styles.hint}>Couldn't load this listing.</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
                    <Text style={{ color: colors.primary, fontWeight: "600" }}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

                <View style={[styles.header, { backgroundColor: colors.primary }]}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={[styles.backButton, { backgroundColor: colors.background }]}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{isEditMode ? "Edit listing" : "Sell a product"}</Text>
                </View>

                <ScrollView contentContainerStyle={styles.form}>
                    <Text style={styles.label}>Photos</Text>
                    <View style={styles.imageRow}>
                        {existingImages.map((url) => (
                            <View key={url} style={styles.imageThumb}>
                                <Image source={{ uri: url }} style={styles.thumbImage} />
                                <TouchableOpacity
                                    style={styles.removeBadge}
                                    onPress={() => removeExistingImage(url)}
                                >
                                    <MaterialCommunityIcons name="close" size={12} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {images.map((img) => (
                            <View key={img.id} style={styles.imageThumb}>
                                <Image source={{ uri: img.uri }} style={styles.thumbImage} />
                                {img.processing && (
                                    <View style={styles.thumbOverlay}>
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={styles.removeBadge}
                                    onPress={() => removeImage(img.id)}
                                >
                                    <MaterialCommunityIcons name="close" size={12} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {existingImages.length + images.length < MAX_IMAGES && (
                            <TouchableOpacity
                                style={[styles.addImage, { borderColor: colors.border || '#E7E4EF' }]}
                                onPress={pickImages}
                            >
                                <MaterialCommunityIcons name="camera-plus-outline" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.hint}>{existingImages.length + images.length}/{MAX_IMAGES} photos</Text>

                    <Text style={styles.label}>Product name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Argan hair oil"
                        placeholderTextColor={colors.textSecondary}
                        value={name}
                        onChangeText={setName}
                    />

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Describe the product, condition, and size"
                        placeholderTextColor={colors.textSecondary}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                    />

                    <Text style={styles.label}>Price ({CURRENCY})</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="decimal-pad"
                        value={price}
                        onChangeText={setPrice}
                    />

                    <Text style={styles.label}>Category</Text>
                    <View style={styles.categoryGrid}>
                        {CATEGORIES.map((c) => (
                            <TouchableOpacity
                                key={c.id}
                                style={[
                                    styles.categoryOption,
                                    {
                                        backgroundColor:
                                            category === c.id
                                                ? colors.primary
                                                : colors.surface,
                                    },
                                ]}
                                onPress={() => setCategory(c.id)}
                            >
                                <MaterialCommunityIcons
                                    name={c.icon as any}
                                    size={18}
                                    color={category === c.id ? "#FFFFFF" : colors.text}
                                />
                                <Text
                                    style={[
                                        styles.categoryLabel,
                                        { color: category === c.id ? "#FFFFFF" : colors.text },
                                    ]}
                                >
                                    {c.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Tags (help buyers find this in search)</Text>
                    <View style={styles.tagInputRow}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginTop: 0 }]}
                            placeholder="e.g. extensions, curly, 18-inch"
                            placeholderTextColor={colors.textSecondary}
                            value={tagInput}
                            onChangeText={setTagInput}
                            onSubmitEditing={addTag}
                            returnKeyType="done"
                        />
                        <TouchableOpacity
                            style={[styles.addTagButton, { backgroundColor: colors.primary }]}
                            onPress={addTag}
                        >
                            <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    {tags.length > 0 && (
                        <View style={styles.tagRow}>
                            {tags.map((tag) => (
                                <TouchableOpacity
                                    key={tag}
                                    style={[styles.tagChip, { backgroundColor: colors.surface }]}
                                    onPress={() => removeTag(tag)}
                                >
                                    <Text style={[styles.tagChipText, { color: colors.text }]}>{tag}</Text>
                                    <MaterialCommunityIcons name="close" size={12} color={colors.text} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                    <Text style={styles.hint}>{tags.length}/{MAX_TAGS} tags · tap a tag to remove it</Text>

                    <Text style={styles.label}>Location</Text>
                    <View style={styles.locationRow}>
                        <TouchableOpacity
                            style={[styles.locationButton, { backgroundColor: colors.surface }]}
                            onPress={() =>
                                router.push({ pathname: '/location/regions', params: { isService: "true" } })
                            }
                        >
                            <MaterialCommunityIcons name="map-marker-outline" size={16} color={colors.primary} />
                            <Text style={[styles.locationButtonText, { color: colors.primary }]}>
                                {selectedLocation ?? "Choose region & district"}
                            </Text>
                        </TouchableOpacity>
                        {selectedLocation !== "Select Location" && (
                            <TouchableOpacity onPress={() => setSelectedLocation("Select Location")}>
                                <MaterialCommunityIcons name="close-circle" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Nearest landmark (optional)"
                        placeholderTextColor={colors.textSecondary}
                        value={landmark}
                        onChangeText={setLandmark}
                    />
                    <Text style={styles.hint}>
                        Adding a location helps buyers nearby find this listing first.
                    </Text>

                    <View style={styles.switchRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Offer delivery</Text>
                            <Text style={styles.hint}>Let buyers know you can ship or drop this off.</Text>
                        </View>
                        <Switch
                            value={isDelivery}
                            onValueChange={setIsDelivery}
                            trackColor={{ false: colors.border || '#E7E4EF', true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    <Text style={styles.label}>How should buyers reach you?</Text>
                    <View style={styles.contactRow}>
                        <TouchableOpacity
                            style={[
                                styles.contactOption,
                                {
                                    borderColor: colors.border || '#E7E4EF',
                                    backgroundColor: !useCall ? colors.text : 'transparent',
                                },
                            ]}
                            onPress={() => setUseCall(false)}
                        >
                            <Text
                                style={[
                                    styles.contactLabel,
                                    { color: !useCall ? colors.background : colors.text },
                                ]}
                            >
                                In-app chat
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.contactOption,
                                {
                                    borderColor: colors.border || '#E7E4EF',
                                    backgroundColor: useCall ? colors.text : 'transparent',
                                },
                            ]}
                            onPress={() => setUseCall(true)}
                        >
                            <Text
                                style={[
                                    styles.contactLabel,
                                    { color: useCall ? colors.background : colors.text },
                                ]}
                            >
                                Call
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {useCall && (
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 0244123456"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="phone-pad"
                            value={callNumber}
                            onChangeText={setCallNumber}
                        />
                    )}
                </ScrollView>

                <View style={[styles.footer, { borderTopColor: colors.border || '#E7E4EF' }]}>
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            { backgroundColor: colors.primary },
                            submitting && styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.submitLabel}>{isEditMode ? "Save changes" : "Publish listing"}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

// ─── Style factory ──────────────────────────────────────────────────────
const createStyles = (colors: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        centered: {
            alignItems: "center",
            justifyContent: "center",
        },
        header: {
            paddingTop: 50,
            paddingHorizontal: 20,
            paddingBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
        },
        headerTitle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#fff',
        },
        form: {
            padding: 16,
            paddingBottom: 32,
        },
        label: {
            fontSize: 13,
            fontWeight: "500",
            color: colors.text,
            marginTop: 18,
            marginBottom: 8,
        },
        hint: {
            fontSize: 11,
            color: colors.textSecondary,
            marginTop: 6,
        },
        imageRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
        },
        imageThumb: {
            width: 72,
            height: 72,
            borderRadius: 10,
            overflow: "hidden",
            position: "relative",
        },
        thumbImage: {
            width: "100%",
            height: "100%",
        },
        thumbOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(0,0,0,0.35)",
            alignItems: "center",
            justifyContent: "center",
        },
        removeBadge: {
            position: "absolute",
            top: 4,
            right: 4,
            backgroundColor: "rgba(0,0,0,0.6)",
            borderRadius: 8,
            width: 16,
            height: 16,
            alignItems: "center",
            justifyContent: "center",
        },
        addImage: {
            width: 72,
            height: 72,
            borderRadius: 10,
            borderWidth: 1,
            borderStyle: "dashed",
            alignItems: "center",
            justifyContent: "center",
        },
        input: {
            borderWidth: 0.5,
            borderColor: colors.border || '#E7E4EF',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: colors.text,
            backgroundColor: colors.surface,
            marginTop: 8,
        },
        textArea: {
            minHeight: 80,
            textAlignVertical: "top",
        },
        categoryGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
        },
        categoryOption: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
        },
        categoryLabel: {
            fontSize: 12,
        },
        locationRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginTop: 10,
        },
        locationButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
        },
        locationButtonText: {
            fontSize: 12,
            fontWeight: "500",
        },
        tagInputRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        addTagButton: {
            width: 40,
            height: 40,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
        },
        tagRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 10,
        },
        tagChip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 14,
        },
        tagChipText: {
            fontSize: 12,
        },
        switchRow: {
            flexDirection: "row",
            alignItems: "center",
            marginTop: 18,
            gap: 12,
        },
        contactRow: {
            flexDirection: "row",
            gap: 8,
        },
        contactOption: {
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 0.5,
            alignItems: "center",
        },
        contactLabel: {
            fontSize: 13,
        },
        footer: {
            padding: 16,
            borderTopWidth: 0.5,
        },
        submitButton: {
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
        },
        submitButtonDisabled: {
            opacity: 0.7,
        },
        submitLabel: {
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: "600",
        },
        backButton: {
            borderRadius: 20,
            padding: 8,
            marginRight: 16,
        },
    });