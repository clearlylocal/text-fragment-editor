import { regex } from 'fancy-regex'
import { FC, useEffect, useMemo, useState } from 'react'

// https://web.dev/text-fragments/

const emptyParts = {
	textStart: '',
	textEnd: '',
	prefix: '',
	suffix: '',
}

const encodedDash =
	'%' + '-'.codePointAt(0)!.toString(16).toUpperCase().padStart(2, '0')

const encodeURIComponent = (x: string) =>
	window.encodeURIComponent(x).split('-').join(encodedDash)

const fmt = (fn: (x: string) => string) => (x?: string) =>
	x ? fn(encodeURIComponent(x)) : ''

export const App: FC = () => {
	const [urlStr, setUrlStr] = useState('')

	const [parts, setParts] = useState(emptyParts)

	const upsertParts = (partial: Partial<typeof emptyParts>) => {
		setParts((parts) => ({ ...parts, ...partial }))
	}

	const { valid, hash } = useMemo(() => {
		try {
			const url = new URL(urlStr)

			return { url, valid: true, hash: url.hash }
		} catch {
			return { url: null, valid: false, hash: '' }
		}
	}, [urlStr])

	useEffect(() => {
		const validChar = regex`[!%'()*\-.0-9A-Z_a-z~]`

		// #:~:text=[prefix-,]textStart[,textEnd][,-suffix]
		const textFragment = regex`
            ^
                \#:~:text=
                (?:(${validChar}+)-,)?  # prefix (optional)
                (${validChar}+)         # textStart
                (?:,(${validChar}+))?   # textEnd (optional)
                (?:,-(${validChar}+))?  # suffix (optional)
            $
        `

		const [, /* match */ prefix, textStart, textEnd, suffix] = (
			hash.match(textFragment) || new Array(5).fill('')
		).map((x) => {
			if (!x) return ''

			try {
				return decodeURIComponent(x)
			} catch {
				return ''
			}
		})

		setParts({
			prefix,
			textStart,
			textEnd,
			suffix,
		})
	}, [hash])

	const newUrl = useMemo(() => {
		try {
			const { prefix, textStart, textEnd, suffix } = parts

			const url = new URL(urlStr)

			if (textStart) {
				// #:~:text=[prefix-,]textStart[,textEnd][,-suffix]
				url.hash = [
					'#:~:text=',
					fmt((x) => `${x}-,`)(prefix),
					fmt((x) => x)(textStart),
					fmt((x) => `,${x}`)(textEnd),
					fmt((x) => `,-${x}`)(suffix),
				]
					.filter(Boolean)
					.join('')
			} else {
				url.hash = hash.startsWith('#:~:text=') ? '' : hash
			}

			return String(url)
		} catch {
			return ''
		}
	}, [parts, urlStr, hash])

	return (
		<div>
			<h1>URL Hash Text Fragment Editor</h1>

			<form onSubmit={(e) => e.preventDefault()}>
				<div>
					<label htmlFor='url'>
						URL
						<br />
					</label>
					<input
						id='url'
						type='text'
						value={urlStr}
						onChange={(e) =>
							setUrlStr(e.currentTarget.value.trim())
						}
					/>
				</div>

				{urlStr.trim() && !valid && <div>Please enter a valid URL</div>}

				<div hidden={!valid}>
					<div>
						<label htmlFor='textStart'>
							Text start
							<br />
						</label>
						<input
							id='textStart'
							type='text'
							value={parts.textStart}
							onChange={(e) =>
								upsertParts({
									textStart: e.currentTarget.value,
								})
							}
						/>
					</div>

					<div>
						<label htmlFor='textEnd'>
							Text end
							<br />
						</label>
						<input
							id='textEnd'
							type='text'
							value={parts.textEnd}
							onChange={(e) =>
								upsertParts({
									textEnd: e.currentTarget.value,
								})
							}
						/>
					</div>

					<div>
						<label htmlFor='prefix'>
							Prefix
							<br />
						</label>
						<input
							id='prefix'
							type='text'
							value={parts.prefix}
							onChange={(e) =>
								upsertParts({
									prefix: e.currentTarget.value,
								})
							}
						/>
					</div>

					<div>
						<label htmlFor='suffix'>
							Suffix
							<br />
						</label>
						<input
							id='suffix'
							type='text'
							value={parts.suffix}
							onChange={(e) =>
								upsertParts({
									suffix: e.currentTarget.value,
								})
							}
						/>
					</div>

					<div>
						<button
							type='button'
							onClick={() => setParts(emptyParts)}
						>
							Remove text fragment
						</button>
					</div>
				</div>
			</form>

			<div
				hidden={!valid}
				style={{
					padding: '20px 0',
				}}
			>
				<div>Output</div>
				<pre
					style={{
						margin: '-10px 0',
						padding: '20px 0',
						userSelect: 'all',
					}}
				>
					<code>{newUrl}</code>
				</pre>
			</div>
		</div>
	)
}
