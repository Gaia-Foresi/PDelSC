// Tarjeta de libro: portada (o inicial sobre el color de la categoría), datos y acciones.
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { font, radius, spacing } from '../theme/tokens';
import { textoSobre } from '../utils/format';
import Badge from './Badge';
import Button from './Button';
import Card from './Card';

export function Portada({ libro, color = '#8FAE8B', width = 74 }) {
  const alto = width * 1.4;
  const [fallo, setFallo] = useState(false);
  useEffect(() => setFallo(false), [libro.portada_url]);
  if (libro.portada_url && !fallo) {
    return (
      <Image
        source={{ uri: libro.portada_url }}
        resizeMode="cover"
        onError={() => setFallo(true)}
        style={{ width, height: alto, borderRadius: radius.sm, backgroundColor: color }}
        accessibilityLabel={`Portada de ${libro.titulo}`}
      />
    );
  }
  return (
    <View style={{ width, height: alto, borderRadius: radius.sm, backgroundColor: color, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 6, borderLeftColor: 'rgba(0,0,0,0.22)' }}>
      <Text style={{ fontSize: width * 0.5, fontWeight: '700', color: textoSobre(color), fontFamily: font.title }}>{(libro.titulo || '?')[0].toUpperCase()}</Text>
    </View>
  );
}

export default function BookCard({ libro, color, onReservar, bloqueado, motivoBloqueo, staff, onEdit, onDelete, mostrarCategoria }) {
  const { colors } = useTheme();
  const sinStock = libro.disponibles <= 0;
  const puedeReservar = !!onReservar && !sinStock && !bloqueado;

  return (
    <Card>
      <View style={styles.row}>
        <Portada libro={libro} color={color || libro.categoria_color} />
        <View style={styles.info}>
          <Text style={[styles.titulo, { color: colors.text, fontFamily: font.title }]}>{libro.titulo}</Text>
          <Text style={[styles.autor, { color: colors.textMuted }]}>{libro.autor}</Text>
          {mostrarCategoria && libro.categoria ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {(libro.categorias?.length ? libro.categorias.map((c) => c.nombre) : [libro.categoria]).map((n) => <Badge key={n} text={n} tone="primary" />)}
            </View>
          ) : null}
          <View style={{ marginTop: 6 }}>
            <Badge
              text={sinStock ? 'Sin ejemplares disponibles' : `${libro.disponibles} de ${libro.stock_total} disponible${libro.disponibles === 1 ? '' : 's'}`}
              tone={sinStock ? 'danger' : 'success'}
              icon={sinStock ? 'close-circle-outline' : 'check-circle-outline'}
            />
          </View>
        </View>
        {staff ? (
          <View>
            <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Editar ${libro.titulo}`} style={styles.iconBtn}>
              <MaterialCommunityIcons name="pencil-outline" size={22} color={colors.primary} />
            </Pressable>
            {onDelete ? (
              <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Eliminar ${libro.titulo}`} style={styles.iconBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.danger} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      {libro.descripcion ? <Text style={[styles.desc, { color: colors.text }]} numberOfLines={4}>{libro.descripcion}</Text> : null}
      {onReservar ? (
        <View style={{ marginTop: spacing.md }}>
          {bloqueado ? (
            <Text style={{ color: colors.danger, fontSize: 13, marginBottom: 8 }}>
              Tu cuenta está bloqueada{motivoBloqueo ? `: ${motivoBloqueo}` : '.'} No podés reservar hasta devolver los libros.
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button title="Leer en sala" icon="seat-outline" variant="secondary" small disabled={!puedeReservar} onPress={() => onReservar('sala')} style={{ flex: 1 }} accessibilityLabel={`Reservar ${libro.titulo} para leer en sala`} />
            <View style={{ width: spacing.sm }} />
            <Button title="Llevar" icon="bag-personal-outline" small disabled={!puedeReservar} onPress={() => onReservar('retiro')} style={{ flex: 1 }} accessibilityLabel={`Reservar ${libro.titulo} para llevar`} />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  info: { flex: 1, marginLeft: spacing.md },
  titulo: { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  autor: { fontSize: 14, marginTop: 2 },
  desc: { fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  actions: { flexDirection: 'row' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
