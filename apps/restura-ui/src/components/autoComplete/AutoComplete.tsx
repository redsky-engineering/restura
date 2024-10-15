import React, { ChangeEvent, useEffect, useState } from 'react';
import './AutoComplete.scss';
import { Box, InputText, Label } from '@redskytech/framework/ui';
import classNames from 'classnames';

interface AutoCompleteProps {
	options: string[];
	startSymbols: string[];
	maxDisplay?: number;
	value: string;
	onChange: (newValue: string, event?: ChangeEvent<HTMLInputElement>) => void;
}

const AutoComplete: React.FC<AutoCompleteProps> = (props) => {
	const [value, setValue] = useState<string>(props.value);
	const [selectedIndex, setSelectedIndex] = useState<number>(0);
	const [cursorPosition, setCursorPosition] = useState<number>(0);
	const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
	const [filter, setFilter] = useState<string>('');
	const [filteredOptions, setFilteredOptions] = useState<string[]>(props.options);

	useEffect(() => {
		if (props.startSymbols.includes(filter[0])) {
			setShowSuggestions(true);
		} else {
			setShowSuggestions(false);
		}
	}, [filter]);

	useEffect(() => {
		setFilteredOptions(() => {
			const filtered = props.options.filter((option) => option.toLowerCase().startsWith(filter.toLowerCase()));
			setSelectedIndex((prev) => {
				if (filtered.length - 1 > prev) {
					return 0;
				}
				return prev;
			});
			return filtered;
		});
	}, [filter, props.options]);

	function findWord(text: string, cursorPos: number): string {
		let leftText = text.slice(0, cursorPos);
		let rightText = text.slice(cursorPos);
		let wordStartPosition = findWordStartPosition(leftText);
		let wordEndPosition = findWordEndPosition(rightText);
		let word = `${leftText.slice(wordStartPosition)}${rightText.slice(0, wordEndPosition)}`;
		return word;
	}

	function findWordStartPosition(text: string): number {
		for (let i = text.length - 1; i >= 0; i--) {
			if (text[i] === ' ') {
				return i + 1;
			}
		}
		return 0;
	}

	function findWordEndPosition(text: string): number {
		for (let i = 0; i < text.length; i++) {
			if (text[i] === ' ') {
				return i;
			}
		}
		return 0;
	}

	function autoComplete(newWord: string) {
		let leftSide = value.slice(0, cursorPosition);
		let rightSide = value.slice(cursorPosition);
		let wordStartPosition = findWordStartPosition(leftSide);
		let wordEndPosition = findWordEndPosition(rightSide);
		let newText = `${leftSide.slice(0, wordStartPosition)}${newWord} ${rightSide.slice(wordEndPosition)}`;
		setFilter('');
		setCursorPosition(newText.length);
		setValue(newText.split(' ').join(' ').trim());
		props.onChange(newText.split(' ').join(' ').trim());
		setShowSuggestions(false);
	}

	function renderAutoComplete() {
		return (
			<Box className={'autoComplete'}>
				{filteredOptions.map((option, index) => {
					if (props.maxDisplay && index >= props.maxDisplay) return;
					return (
						<Label
							key={index}
							className={classNames({ highlighted: index === selectedIndex })}
							variant={'body1'}
							weight={'regular'}
							onClick={() => {
								autoComplete(option);
							}}
						>
							{option}
						</Label>
					);
				})}
			</Box>
		);
	}

	return (
		<Box className={'rsAutoComplete'}>
			<InputText
				inputMode={'text'}
				value={value}
				onChange={(newValue, event) => {
					const cursor = event.target.selectionStart || 0;
					let wordToFilter = findWord(newValue, cursor);
					setFilter(wordToFilter);
					setCursorPosition(cursor);
					setValue(newValue);
				}}
				onBlur={() => {
					if (value === props.value) return;
					props.onChange(value);
				}}
				onKeyDown={(event) => {
					if (!showSuggestions) return;
					if (event.key === 'Enter' || event.key === 'Tab') {
						event.preventDefault();
						autoComplete(filteredOptions[selectedIndex]);
					}
					if (event.key === 'ArrowDown') {
						event.stopPropagation();
						event.preventDefault();
						setSelectedIndex((prev) => {
							if (
								(props.maxDisplay && prev + 1 >= props.maxDisplay) ||
								prev + 1 >= filteredOptions.length
							) {
								return 0;
							}
							return prev + 1;
						});
					}
					if (event.key === 'ArrowUp') {
						event.stopPropagation();
						event.preventDefault();
						setSelectedIndex((prev) => {
							if (prev - 1 < 0) {
								if (props.maxDisplay && props.maxDisplay < filteredOptions.length) {
									return props.maxDisplay - 1;
								}
								return filteredOptions.length - 1;
							}
							return prev - 1;
						});
					}
				}}
			/>
			{showSuggestions && renderAutoComplete()}
		</Box>
	);
};

export default AutoComplete;
