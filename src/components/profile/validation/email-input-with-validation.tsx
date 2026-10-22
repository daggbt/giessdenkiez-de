import React from "react";
import { TextInput } from "../../input/text-input";
import { useI18nStore } from "../../../i18n/i18n-store";
import { Warning } from "./warning";
import { useEmailTakenStore } from "./email-taken-store";
import { useResetIsEmailTakenOnUnmount } from "./hooks/use-reset-is-email-taken-on-unmount";

export interface EmailInputValidationProps {
	label: string | React.ReactNode;
	defaultValue?: string;
}

export const EmailInputWithValidation: React.FC<EmailInputValidationProps> = ({
	label,
	defaultValue,
}) => {
	const i18n = useI18nStore().i18n();
	const { isEmailTaken, resetErrorMessages } = useEmailTakenStore();

	/**
	 * because the emailTakenStore is shared between the components register.tsx and edit-email.tsx
	 * we need to reset the warning "e-mail is taken" when this component is unmounted, so that
	 * the warning is not wrongly shown when they are mounted
	 */
	useResetIsEmailTakenOnUnmount();

	return (
		<>
			<label className="font-semibold" htmlFor="email">
				{label}
			</label>
			<TextInput
				type="email"
				id="email"
				name="email"
				required
				defaultValue={defaultValue}
				onChange={(e) => resetErrorMessages(e)}
				autoFocus
			/>
			{isEmailTaken && (
				<Warning label={i18n.navbar.profile.settings.emailTaken} />
			)}
		</>
	);
};
