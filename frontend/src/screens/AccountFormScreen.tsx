import { useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Back,
  Button,
  Check,
  Contacts,
  ErrorMessage,
  Field,
  Heading,
  Page,
  Section,
  Select,
  styles,
} from "../components/ui";
import { useAccess } from "../features/access/AccessContext";
import {
  ageOn,
  formatBirthDate,
  initialPassword,
  isSuperAdmin,
} from "../features/access/domain";
import {
  roleLabels,
  type ProfileInput,
  type Role,
  type RootStackParamList,
} from "../features/access/types";

export default function AccountFormScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, "AccountForm">) {
  const { accounts, athletes, groups, current, saveProfile } = useAccess();
  const target = route.params;
  const student = target?.athleteId
    ? athletes.find((item) => item.id === target.athleteId)
    : athletes.find(
        (item) => item.accountId === target?.accountId && !!target?.accountId,
      );
  const existing = accounts.find(
    (item) => item.id === (target?.accountId ?? student?.accountId),
  );
  const person = existing ?? student;
  const [name, setName] = useState(person?.name ?? "");
  const [birthDate, setBirthDate] = useState(person?.birthDate ?? "");
  const [emails, setEmails] = useState(
    person?.emails.length ? person.emails : [""],
  );
  const [phones, setPhones] = useState(
    person?.phones.length ? person.phones : [""],
  );
  const [role, setRole] = useState<Role | "">(
    existing?.role ?? (student ? "athlete" : ""),
  );
  const [groupId, setGroupId] = useState(student?.groupId ?? "");
  const [guardianId, setGuardianId] = useState(student?.guardianId ?? "");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const submitted = useRef(false);
  const age = ageOn(birthDate);
  const minor = role === "athlete" && age >= 0 && age < 18;
  const createsAccess = !!role && age >= 0 && !minor && !existing;
  const guardians = accounts.filter(
    (account) => account.role === "responsible" && account.active,
  );
  let preview = "";
  if (createsAccess) {
    try {
      preview = initialPassword(name, birthDate);
    } catch {
      /* Wait for complete input. */
    }
  }
  if (!isSuperAdmin(current)) return null;
  if (target && !person)
    return (
      <Page>
        <Back onPress={navigation.goBack} />
        <ErrorMessage message="Perfil não encontrado." />
      </Page>
    );
  function save() {
    if (submitted.current) return;
    if (!role) {
      setError("Selecione a função.");
      return;
    }
    try {
      const input: ProfileInput = {
        name,
        birthDate,
        emails,
        phones,
        role,
        groupId: role === "athlete" ? groupId : undefined,
        guardianId: minor ? guardianId : undefined,
      };
      const result = saveProfile(input, target);
      submitted.current = true;
      const message = !result.hasAccess
        ? "Aluno vinculado ao responsável selecionado. Não foi criada conta ou senha para o menor. A senha do responsável permanece a mesma."
        : result.password
          ? result.name +
            "\nSenha inicial: " +
            result.password +
            (role === "athlete"
              ? "\nO cadastro de aluno também foi criado automaticamente."
              : "")
          : "Perfil atualizado. A senha existente permanece a mesma.";
      Alert.alert(
        target ? "Perfil atualizado" : "Perfil cadastrado",
        message + "\n\nDemonstração: dados mantidos apenas nesta sessão.",
        [{ text: "Concluir", onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Page>
      <Back onPress={navigation.goBack} />
      <Heading
        title={target ? "EDITAR PERFIL" : "NOVO PERFIL"}
        subtitle="Cadastro unificado de administradores, responsáveis e alunos."
      />
      <Section title="Função">
        {existing?.isSuperAdmin ? (
          <>
            <Text style={styles.text}>Superadmin</Text>
            <Text style={styles.muted}>Perfil definido no banco de dados.</Text>
          </>
        ) : (
          <Select
            label="Função *"
            value={role}
            options={Object.entries(roleLabels).map(([value, label]) => ({
              value,
              label,
            }))}
            onChange={(value) => {
              setRole(value as Role);
              setError("");
            }}
          />
        )}
        {role === "admin" && !existing?.isSuperAdmin && (
          <Text style={styles.muted}>
            Acesso a turmas, alunos e frequência. Sem gestão de contas,
            financeiro ou cadastro de eventos.
          </Text>
        )}
        {role === "responsible" && (
          <Text style={styles.muted}>
            O responsável recebe uma conta e senha inicial. Os alunos menores
            serão vinculados pelo cadastro de perfil de atleta.
          </Text>
        )}
      </Section>
      <Section
        title={role === "athlete" ? "Dados do aluno" : "Dados do titular"}
      >
        <Field
          label="Nome completo *"
          placeholder="Nome completo"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <Field
          label="Data de nascimento *"
          placeholder="dd/mm/aaaa"
          keyboardType="number-pad"
          maxLength={10}
          value={birthDate}
          onChangeText={(value) => setBirthDate(formatBirthDate(value))}
        />
        <Field
          label="Idade (calculada)"
          value={age >= 0 ? age + " anos" : ""}
          placeholder="Preencha a data de nascimento"
          editable={false}
        />
        <Contacts
          kind="email"
          values={emails}
          onChange={setEmails}
          required={!minor}
        />
        <Contacts kind="phone" values={phones} onChange={setPhones} />
      </Section>
      {role === "athlete" && (
        <Section title="Vínculo do aluno">
          <Select
            label="Turma *"
            value={groupId}
            options={groups.map((group) => ({
              value: group.id,
              label: group.name + " · " + group.schedule,
            }))}
            onChange={setGroupId}
          />
          {minor ? (
            <>
              <Select
                label="Responsável já cadastrado *"
                value={guardianId}
                options={guardians.map((account) => ({
                  value: account.id,
                  label: account.name,
                }))}
                onChange={setGuardianId}
              />
              {!guardians.length && (
                <Text accessibilityRole="alert" style={styles.muted}>
                  Nenhum responsável ativo disponível. Cancele este cadastro e
                  cadastre primeiro um perfil de Responsável em Gerenciamento de
                  Contas.
                </Text>
              )}
              <Text style={styles.muted}>
                Menores de 18 anos não recebem conta ou senha própria. O acesso
                às informações será pela conta do responsável selecionado.
              </Text>
            </>
          ) : age >= 18 ? (
            <Text style={styles.muted}>
              A partir de 18 anos, o atleta recebe conta própria e é cadastrado
              automaticamente como aluno.
            </Text>
          ) : (
            <Text style={styles.muted}>
              Informe o nascimento para definir o acesso do atleta.
            </Text>
          )}
        </Section>
      )}
      {createsAccess && (
        <Section title="Senha inicial automática">
          <Field
            label="Senha inicial · RN015"
            value={preview}
            placeholder="Preencha nome e nascimento"
            editable={false}
            secureTextEntry={!visible}
          />
          <Check
            label="Mostrar senha inicial"
            value={visible}
            onChange={setVisible}
          />
          <Text style={styles.muted}>
            Três primeiros caracteres do nome do titular sem acentos,
            preservando maiúsculas, seguidos do nascimento em DDMMAAAA.
          </Text>
        </Section>
      )}
      <ErrorMessage message={error} />
      <View
        style={[
          styles.row,
          { justifyContent: "space-between", flexWrap: "wrap" },
        ]}
      >
        <Button title="CANCELAR" secondary onPress={navigation.goBack} />
        <Button
          title={target ? "SALVAR ALTERAÇÕES" : "CADASTRAR PERFIL"}
          onPress={save}
          disabled={minor && !guardians.length}
        />
      </View>
    </Page>
  );
}
