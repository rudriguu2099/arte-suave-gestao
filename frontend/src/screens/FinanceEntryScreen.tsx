import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminFooter } from "../components/access";
import {
  Back,
  Button,
  colors,
  Dialog,
  ErrorMessage,
  Field,
  Heading,
  Page,
  Section,
  Select,
  styles,
} from "../components/ui";
import { useAccess } from "../features/access/AccessContext";
import { formatBirthDate, isSuperAdmin } from "../features/access/domain";
import type { RootStackParamList } from "../features/access/types";
import { ApiError } from "../services/api";
import {
  expenseCategories,
  expenseStatuses,
  financeApi,
  paymentMethods,
  revenueCategories,
} from "../services/finance";
import { formatarMoeda, moedaParaNumero, numeroParaMoeda, validarLancamento } from "../utils/validators";

type Kind = "revenue" | "expense";
const kinds = [
  { kind: "revenue", label: "RECEITA", color: "#0CC50C" },
  { kind: "expense", label: "DESPESA", color: "#D80000" },
] as const;

// HU015 (receita), HU016 (despesa), HU018 (doação/patrocínio) e edição a partir do painel (HU019 / RF012 / RF013).
export default function FinanceEntryScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "FinanceEntry">) {
  const { current, athletes, getToken, signOut } = useAccess();
  const edit = route.params?.edit;
  const initialDestination =
    edit?.kind === "revenue" && edit.category === "PATROCINIO_DOACAO"
      ? edit.studentId
        ? edit.studentId
        : "OUTROS"
      : "";

  const [kind, setKind] = useState<Kind>(edit?.kind ?? "revenue");
  const [category, setCategory] = useState(edit?.category ?? route.params?.category ?? "");
  const [title, setTitle] = useState(edit?.title ?? "");
  const [donor, setDonor] = useState(edit?.donor ?? "");
  const [destination, setDestination] = useState(initialDestination);
  const [beneficiary, setBeneficiary] = useState(edit?.beneficiary ?? "");
  const [amount, setAmount] = useState(edit ? numeroParaMoeda(edit.amount) : (route.params?.amount ?? ""));
  const [date, setDate] = useState(edit?.date ?? route.params?.date ?? "");
  const [description, setDescription] = useState(edit?.description ?? "");
  const [paymentMethod, setPaymentMethod] = useState(edit?.paymentMethod ?? "");
  const [status, setStatus] = useState(edit?.status ?? "");
  const [studentId, setStudentId] = useState(edit?.studentId ?? route.params?.studentId ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const submitted = useRef(false);
  if (!isSuperAdmin(current)) return null;

  const revenue = kind === "revenue";
  const activeAthletes = athletes
    .filter((athlete) => athlete.active)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((athlete) => ({ value: athlete.id, label: athlete.name }));
  if (edit?.student && !activeAthletes.some((option) => option.value === edit.student!.id)) {
    activeAthletes.push({ value: edit.student.id, label: edit.student.name });
  }
  const destinationOptions = [...activeAthletes, { value: "OUTROS", label: "Outros" }];

  function changeKind(next: Kind) {
    if (edit) return;
    // As categorias de receita e despesa são diferentes; OUTROS existe nas duas.
    if (category !== "OUTROS") setCategory("");
    setKind(next);
    setError("");
  }

  async function save() {
    if (submitted.current) return;
    const invalid = validarLancamento({
      categoria: category,
      titulo: title,
      atleta: studentId,
      doador: donor,
      destino: destination,
      beneficiado: beneficiary,
      valor: amount,
      data: date,
      extra: revenue ? paymentMethod : status,
      nomeExtra: revenue ? "a forma de recebimento" : "a situação",
    });
    if (invalid) return setError(invalid);
    submitted.current = true;
    setSaving(true);
    setError("");
    const entry = {
      category,
      title: category === "OUTROS" ? title.trim() : undefined,
      amount: moedaParaNumero(amount),
      date,
      description: description.trim(),
    };
    try {
      if (revenue) {
        const linkedStudentId =
          category === "AJUDA_DE_CUSTO"
            ? studentId
            : category === "PATROCINIO_DOACAO" && destination !== "OUTROS"
              ? destination
              : edit
                ? null
                : undefined;
        const payload = {
          ...entry,
          paymentMethod,
          donor: category === "PATROCINIO_DOACAO" ? donor.trim() : undefined,
          beneficiary:
            category === "PATROCINIO_DOACAO" && destination === "OUTROS" ? beneficiary.trim() : undefined,
        };
        if (edit) {
          await financeApi.updateRevenue(getToken(), edit.id, { ...payload, studentId: linkedStudentId });
        } else {
          await financeApi.createRevenue(getToken(), { ...payload, studentId: linkedStudentId ?? undefined });
        }
      } else if (edit) {
        await financeApi.updateExpense(getToken(), edit.id, { ...entry, status });
      } else {
        await financeApi.createExpense(getToken(), { ...entry, status });
      }
      setDone(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return signOut();
      setError((e as Error).message);
      submitted.current = false;
    } finally {
      setSaving(false);
    }
  }
  return (
    <Page footer={<AdminFooter navigation={navigation} active="Finance" />}>
      <Dialog
        visible={done}
        title={edit ? "Lançamento atualizado" : "Lançamento registrado"}
        message={`${revenue ? "Receita" : "Despesa"} de R$ ${amount} ${edit ? "atualizada" : "registrada"}.`}
        onClose={navigation.goBack}
      />
      <Back onPress={navigation.goBack} />
      <Heading title={edit ? "EDITAR LANÇAMENTO" : "NOVO LANÇAMENTO"} />
      <View style={{ flexDirection: "row" }}>
        {kinds.map((option) => {
          const active = kind === option.kind;
          return (
            <Pressable
              key={option.kind}
              accessibilityRole="tab"
              accessibilityState={{ selected: active, disabled: !!edit }}
              disabled={!!edit}
              onPress={() => changeKind(option.kind)}
              style={{
                flex: 1,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: active ? option.color : colors.border,
                backgroundColor: active ? option.color : colors.paper,
                opacity: edit && !active ? 0.45 : 1,
              }}
            >
              <Text style={[styles.text, { color: active ? colors.paper : colors.ink }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Section>
        <Select
          label="Categoria *"
          value={category}
          onChange={setCategory}
          options={revenue ? revenueCategories : expenseCategories}
        />
        {category === "OUTROS" && (
          <Field label="Título *" placeholder="Ex: Rifa beneficente" maxLength={80} value={title} onChangeText={setTitle} />
        )}
        <Field
          label="Valor (R$) *"
          placeholder="0,00"
          keyboardType="number-pad"
          maxLength={13}
          value={amount}
          onChangeText={(value) => setAmount(formatarMoeda(value))}
        />
        <Field
          label="Data *"
          placeholder="dd/mm/aaaa"
          keyboardType="number-pad"
          maxLength={10}
          value={date}
          onChangeText={(value) => setDate(formatBirthDate(value))}
        />
        <Field
          label="Descrição"
          placeholder="Descrição do lançamento"
          maxLength={500}
          multiline
          value={description}
          onChangeText={setDescription}
        />
        {revenue ? (
          <Select label="Forma de recebimento *" value={paymentMethod} onChange={setPaymentMethod} options={paymentMethods} />
        ) : (
          <Select label="Situação *" value={status} onChange={setStatus} options={expenseStatuses} />
        )}
        {revenue && category === "AJUDA_DE_CUSTO" && (
          <Select label="Atleta *" value={studentId} onChange={setStudentId} options={activeAthletes} />
        )}
        {revenue && category === "PATROCINIO_DOACAO" && (
          <>
            <Field
              label="Doador / Patrocinador *"
              placeholder="Nome ou empresa"
              maxLength={80}
              value={donor}
              onChangeText={setDonor}
            />
            <Select label="Destino *" value={destination} onChange={setDestination} options={destinationOptions} />
            {destination === "OUTROS" && (
              <Field
                label="Beneficiado *"
                placeholder="Informe o beneficiado"
                maxLength={80}
                value={beneficiary}
                onChangeText={setBeneficiary}
              />
            )}
          </>
        )}
      </Section>
      <ErrorMessage message={error} />
      <View style={styles.row}>
        <Button title="CANCELAR" secondary disabled={saving} onPress={navigation.goBack} />
        <View style={{ flex: 1 }}>
          <Button
            title={saving ? (edit ? "SALVANDO..." : "REGISTRANDO...") : edit ? "SALVAR" : "REGISTRAR"}
            disabled={saving}
            onPress={save}
          />
        </View>
      </View>
    </Page>
  );
}
