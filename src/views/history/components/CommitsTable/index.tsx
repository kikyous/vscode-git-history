import {
	FC,
	FormEvent,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { useMeasure } from "react-use";

import type { IBatchedCommits } from "../../../../git/types";

import PickableList from "../PickableList";
import { ChannelContext } from "../../data/channel";

import { ICommit, parseCommit } from "../../../../git/commit";

import { useBatchCommits } from "./useBatchCommits";
import { useColumnResize } from "./useColumnResize";

import { HEADERS } from "./constants";

import style from "./index.module.scss";

const CommitsTableInner: FC<{ totalWidth: number }> = ({ totalWidth }) => {
	const channel = useContext(ChannelContext)!;

	const { commits, commitsCount, options, setBatchedCommits } =
		useBatchCommits();

	function diff(sortedRefs: string[]) {
		channel.viewChanges(sortedRefs);
	}

	const subscribeSwitcher = useCallback(() => {
		channel.subscribeSwitcher((batchedCommits: IBatchedCommits) =>
			setBatchedCommits(batchedCommits)
		);
	}, [channel, setBatchedCommits]);

	const onSelectReference = useCallback(
		() => channel.switchReference(),
		[channel]
	);

	const onFilter = useCallback(
		() => {
			channel.filterAuthor((batchedCommits: IBatchedCommits) =>
				setBatchedCommits(batchedCommits)
			);
		},
		[channel, setBatchedCommits]
	);

	const [keyword, setKeyword] = useState("");

	const onKeywordFilter = (event: FormEvent) => {
		event.preventDefault();
		channel.filterMessage(
			(batchedCommits: IBatchedCommits) =>
				setBatchedCommits(batchedCommits),
			keyword
		);
	};

	const [locationIndex, setLocationIndex] = useState<number>();
	const onLocate = useCallback(
		async (prop: string) => {
			switch (prop) {
				case "hash":
					const hash = await channel.inputHash();
					if (!hash) {
						return;
					}

					const index = commits.findIndex((commit) =>
						commit.startsWith(hash || "")
					);

					if (index === -1) {
						channel.showWarningMessage("No commit matched!");
					}

					setLocationIndex(index);
					// destroy location index after the blink animation finished
					setTimeout(() => {
						setLocationIndex(undefined);
					}, 1500);
					break;
			}
		},
		[channel, commits]
	);

	// TODO: columns setting
	const headers = useMemo(() => {
		return HEADERS;
	}, []);

	const { columns } = useColumnResize(headers, totalWidth);

	useEffect(() => {
		subscribeSwitcher();

		channel.autoRefreshLog();
	}, [channel, subscribeSwitcher]);

	return (
		<>
			<div className={style["commit-headers"]}>
				{columns.map(
					(
						{
							prop,
							label,
							filterable,
							locatable,
							filterLogOption,
							hasDivider,
							size,
							dragBind,
						},
						index
					) => {
						let content;
						if (prop === "graph") {
							content = <VSCodeButton
								className={style["ref-button"]}
								data-button
								appearance="icon"
								title={`Select Branch/Reference · ${options.ref || "All"
									}`}
								aria-label="All"
								onClick={() => onSelectReference()}
							>
								<span className="codicon codicon-git-branch" />
								<span className={style.text}>
									{options.ref || "All"}
								</span>
							</VSCodeButton>;
						} else if (prop === "description") {
							content =
								<form onSubmit={onKeywordFilter} className={style['desc-filter-form']}>
									<label className={style.desc}>
										<span className={`codicon codicon-filter${options.keyword?.length ? "-filled" : ""}`} />
										<input type="text" value={keyword} placeholder={label} onChange={(e) => setKeyword(e.target.value)} />
									</label>
								</form>
								;
						} else {
							content = <>
								<span>{label}</span>
								{filterable && (
									<VSCodeButton
										appearance="icon"
										onClick={onFilter}
									>
										<span
											className={`codicon codicon-filter${options[
												filterLogOption as
												| "authors"
												| "keyword"
											]?.length
												? "-filled"
												: ""
												}`}
										/>
									</VSCodeButton>
								)}
								{locatable && (
									<VSCodeButton
										appearance="icon"
										onClick={() => onLocate(prop)}
									>
										<span className="codicon codicon-search" />
									</VSCodeButton>
								)}
							</>;
						}
						return <div
							key={prop}
							className={style["header-item"]}
							style={{
								width: `${size}px`,
							}}
						>
							{hasDivider && (
								<div
									{...dragBind(index)}
									className={style.divider}
								/>
							)}

							{content}


						</div >;
					}
				)}
			</div >
			<div className={style["commits-area"]}>
				<PickableList
					list={commits}
					keyLength={40}
					locationIndex={locationIndex}
					itemPipe={parseCommit}
					itemRender={(commit: ICommit) => (
						<div className={style.commit}>
							{columns.map(({ prop, size, transformer }) => (
								<span
									style={{
										width: `${size}px`,
									}}
									data-prop={prop}
									key={prop}
								>
									{transformer(commit)}
								</span>
							))}
						</div>
					)}
					size={commitsCount}
					onPick={(ids) => diff(ids)}
				/>
			</div>
		</>
	);
};

const CommitsTable: FC = () => {
	const [ref, { width }] = useMeasure<HTMLDivElement>();

	return (
		<div ref={ref} className={style.container}>
			<CommitsTableInner totalWidth={width} />
		</div>
	);
};

export default CommitsTable;
